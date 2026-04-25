/**
 * Devnet "Mint USDC" faucet — credits the connected user's IncoAccount with
 * encrypted USDC. Uses the issuer keypair stored in .keys/issuer.json (server-side
 * only). Idempotently creates the user's IncoAccount if missing.
 *
 * POST body: { user: string (base58 pubkey), amount?: number (UI units, default 100) }
 * Returns:   { success: true, sig, ata, amountBaseUnits } | { error }
 */
import { NextRequest, NextResponse } from "next/server";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  INCO_LIGHTNING_PROGRAM_ID,
  INCO_TOKEN_PROGRAM_ID,
  loadKeypair,
  makeProvider,
  getIncoAta,
  getAllowancePda,
  extractAmountHandle,
} from "../../../scripts/common";

const TOKEN_DECIMALS = 6;

export async function POST(req: NextRequest) {
  try {
    const { user, amount = 100 } = await req.json();
    if (!user || typeof user !== "string") {
      return NextResponse.json({ error: "missing 'user' (base58 pubkey)" }, { status: 400 });
    }
    let userPubkey: PublicKey;
    try {
      userPubkey = new PublicKey(user);
    } catch {
      return NextResponse.json({ error: "invalid pubkey" }, { status: 400 });
    }

    const mint = new PublicKey("7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB");

    const issuer = loadKeypair(".keys/issuer.json");
    const { connection, program } = makeProvider(issuer);

    const { encryptValue } = (await import("@inco/solana-sdk/encryption")) as any;
    const { hexToBuffer } = (await import("@inco/solana-sdk/utils")) as any;

    const ata = getIncoAta(userPubkey, mint);

    const accountInfo = await connection.getAccountInfo(ata);
    if (!accountInfo) {
      const createSig = await program.methods
        .createIdempotent()
        .accounts({
          payer: issuer.publicKey,
          associatedToken: ata,
          wallet: userPubkey,
          mint,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        } as any)
        .rpc();
      console.log(`[mint-usdc] created IncoAccount for ${user}: ${createSig}`);
    }

    const amountBaseUnits = BigInt(Math.floor(amount * 10 ** TOKEN_DECIMALS));
    const ctHex: string = await encryptValue(amountBaseUnits);
    const ctBuf: Buffer = hexToBuffer(ctHex);

    const simIx = await program.methods
      .mintTo(ctBuf, 0)
      .accounts({
        mint,
        account: ata,
        mintAuthority: issuer.publicKey,
        incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();
    const simTx = new Transaction().add(simIx);
    simTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    simTx.feePayer = issuer.publicKey;
    const sim = await connection.simulateTransaction(simTx, undefined, [ata]);
    if (sim.value.err) {
      return NextResponse.json(
        { error: "simulation failed", details: sim.value.err, logs: sim.value.logs },
        { status: 500 },
      );
    }
    const data = sim.value.accounts?.[0]?.data?.[0];
    if (!data) {
      return NextResponse.json({ error: "no sim account data" }, { status: 500 });
    }
    const handle = extractAmountHandle(data);
    // Grant decrypt allowance to the recipient (user), not the issuer.
    // Covalidator looks up (handle, address) in the allowance PDA and rejects
    // decrypt requests from any other address. Keeping issuer here means the
    // user can NEVER decrypt their own balance — that was the airdrop.ts copy
    // bug.
    const allowancePda = getAllowancePda(handle, userPubkey);

    const sig = await program.methods
      .mintTo(ctBuf, 0)
      .accounts({
        mint,
        account: ata,
        mintAuthority: issuer.publicKey,
        incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: allowancePda, isSigner: false, isWritable: true },
        { pubkey: userPubkey, isSigner: false, isWritable: false },
      ])
      .rpc();

    // Re-read the IncoAccount AFTER mint to get the post-mint handle (the one
    // Covalidator will have indexed). The sim handle can drift if other state
    // changed between sim and submit.
    let postHandleHex = handle.toString(16);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const post = await connection.getAccountInfo(ata);
      if (post) {
        let h = 0n;
        for (let i = 15; i >= 0; i--) h = h * 256n + BigInt(post.data[72 + i]);
        postHandleHex = h.toString(16);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      sig,
      ata: ata.toBase58(),
      mint: mint.toBase58(),
      amountBaseUnits: amountBaseUnits.toString(),
      uiAmount: amount,
      simHandleHex: handle.toString(16),
      postHandleHex,
      handleMatches: handle.toString(16) === postHandleHex,
    });
  } catch (e) {
    console.error("[mint-usdc] error:", e);
    return NextResponse.json(
      { error: (e as Error).message || String(e) },
      { status: 500 },
    );
  }
}
