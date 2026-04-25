/**
 * Read the encrypted balance handle for a user's IncoAccount on the configured
 * TOKEN_MINT. Returns the encrypted handle (NOT plaintext). Decryption happens
 * client-side via the user's signMessage (attested-decrypt).
 *
 * GET ?user=<base58 pubkey>
 * Returns: { exists, ata, handleHex, mint } | { error }
 */
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  INCO_TOKEN_PROGRAM_ID,
  loadKeypair,
  loadIncoTokenIdl,
  getIncoAta,
} from "../../../scripts/common";

export async function GET(req: NextRequest) {
  try {
    const user = req.nextUrl.searchParams.get("user");
    if (!user) {
      return NextResponse.json({ error: "missing 'user' query param" }, { status: 400 });
    }
    let userPubkey: PublicKey;
    try {
      userPubkey = new PublicKey(user);
    } catch {
      return NextResponse.json({ error: "invalid pubkey" }, { status: 400 });
    }

    const mintStr = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT;
    if (!mintStr) {
      return NextResponse.json({ error: "TOKEN_MINT not set in env" }, { status: 500 });
    }
    const mint = new PublicKey(mintStr);

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    const ata = getIncoAta(userPubkey, mint);
    const info = await connection.getAccountInfo(ata);
    if (!info) {
      return NextResponse.json({
        exists: false,
        ata: ata.toBase58(),
        mint: mint.toBase58(),
        handleHex: null,
      });
    }

    const idl = loadIncoTokenIdl();
    const dummy = loadKeypair(".keys/issuer.json");
    const wallet = {
      publicKey: dummy.publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);

    let handleHex: string | null = null;
    try {
      const acc: any = await (program.account as any).incoAccount.fetch(ata);
      const h = BigInt(acc.amount[0].toString());
      handleHex = h.toString(16);
    } catch (e) {
      // account exists but might be uninitialized format — fall back to raw bytes parse
      const buf = info.data;
      let h = 0n;
      for (let i = 15; i >= 0; i--) h = h * 256n + BigInt(buf[72 + i]);
      handleHex = h.toString(16);
    }

    return NextResponse.json({
      exists: true,
      ata: ata.toBase58(),
      mint: mint.toBase58(),
      handleHex,
    });
  } catch (e) {
    console.error("[balance] error:", e);
    return NextResponse.json(
      { error: (e as Error).message || String(e) },
      { status: 500 },
    );
  }
}
