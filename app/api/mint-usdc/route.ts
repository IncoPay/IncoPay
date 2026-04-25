/**
 * Devnet "Mint USDC" faucet — credits the connected user's IncoAccount with
 * encrypted USDC.
 *
 * On Vercel, the issuer keypair is loaded from env var ISSUER_SECRET_KEY
 * (JSON array of 64 numbers). Locally, falls back to .keys/issuer.json.
 *
 * POST body: { user: string (base58 pubkey), amount?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import incoTokenIdl from "../../../public/idl/inco_token.json";

const TOKEN_DECIMALS = 6;
const RPC_URL = "https://api.devnet.solana.com";
const MINT_ADDRESS = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
const INCO_TOKEN_PROGRAM_ID = new PublicKey("9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi");
const INCO_LIGHTNING_PROGRAM_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");

function loadIssuerKeypair(): Keypair {
  const envSecret = process.env.ISSUER_SECRET_KEY;
  if (envSecret) {
    const arr = JSON.parse(envSecret) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
  // Local dev fallback — only works when filesystem access is available.
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const candidates = [
    path.resolve(process.cwd(), ".keys/issuer.json"),
    path.resolve(process.cwd(), "../.keys/issuer.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const secret = JSON.parse(fs.readFileSync(p, "utf-8")) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    }
  }
  throw new Error("issuer keypair not configured: set ISSUER_SECRET_KEY env var");
}

function getIncoAta(wallet: PublicKey, mint: PublicKey): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), INCO_TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    INCO_TOKEN_PROGRAM_ID,
  );
  return addr;
}

function getAllowancePda(handle: bigint, allowedAddress: PublicKey): PublicKey {
  const buf = Buffer.alloc(16);
  let h = handle;
  for (let i = 0; i < 16; i++) {
    buf[i] = Number(h & BigInt(0xff));
    h >>= BigInt(8);
  }
  const [pda] = PublicKey.findProgramAddressSync(
    [buf, allowedAddress.toBuffer()],
    INCO_LIGHTNING_PROGRAM_ID,
  );
  return pda;
}

function extractAmountHandle(base64Data: string): bigint {
  const buf = Buffer.from(base64Data, "base64");
  const bytes = buf.slice(72, 88);
  let h = 0n;
  for (let i = 15; i >= 0; i--) h = h * 256n + BigInt(bytes[i]);
  return h;
}

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

    const mint = new PublicKey(MINT_ADDRESS);
    const issuer = loadIssuerKeypair();

    const connection = new Connection(RPC_URL, "confirmed");
    const wallet = {
      publicKey: issuer.publicKey,
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(issuer);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) =>
        txs.map((t) => {
          t.partialSign(issuer);
          return t;
        }),
    };
    const provider = new anchor.AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);
    const idl = incoTokenIdl as anchor.Idl;
    if (!(idl as any).address) (idl as any).address = INCO_TOKEN_PROGRAM_ID.toBase58();
    const program = new anchor.Program(idl, provider);

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
