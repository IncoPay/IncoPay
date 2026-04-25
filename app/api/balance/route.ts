/**
 * Read the encrypted balance handle for a user's IncoAccount.
 * Returns the encrypted handle (NOT plaintext). Decryption happens client-side
 * via the user's signMessage (attested-decrypt).
 *
 * GET ?user=<base58 pubkey>
 */
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const MINT_ADDRESS = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
const RPC_URL = "https://api.devnet.solana.com";
const INCO_TOKEN_PROGRAM_ID = new PublicKey("9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi");

function getIncoAta(wallet: PublicKey, mint: PublicKey): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), INCO_TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    INCO_TOKEN_PROGRAM_ID,
  );
  return addr;
}

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

    const mint = new PublicKey(MINT_ADDRESS);
    const connection = new Connection(RPC_URL, "confirmed");

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

    // Bytes 72-87 are the 16-byte little-endian encrypted amount handle.
    let h = 0n;
    for (let i = 15; i >= 0; i--) h = h * 256n + BigInt(info.data[72 + i]);
    const handleHex = h.toString(16);

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
