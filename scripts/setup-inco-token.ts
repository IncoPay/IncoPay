/**
 * Setup IncoMint + IncoToken accounts so the /test UI can run confidential transfers.
 * Run from my-app: yarn setup-inco-token
 *
 * 1. Creates an IncoMint (initialize_mint)
 * 2. Creates IncoToken ATAs for source and recipient (create_idempotent)
 * 3. Mints tokens to source account (mint_to)
 * 4. Writes NEXT_PUBLIC_TOKEN_MINT to .env.local
 */

import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { encryptValue } from "@inco/solana-sdk/encryption";
import { hexToBuffer } from "@inco/solana-sdk/utils";

config({ path: path.join(process.cwd(), ".env.local") });

const INCO_LIGHTNING_PROGRAM_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");
const INCO_TOKEN_PROGRAM_ID = new PublicKey("9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi");

// Wallets from your UI: source = connected wallet, destination = recipient
const SOURCE_WALLET = new PublicKey("2A8awXcMSwNWLZKc9eHqwuGTDP6Up5WhXs7zDmRTnX98");
const RECIPIENT_WALLET = new PublicKey("E9cRHNKU5wWVtovCRsSwnL1zvmVsLjiHrtQvRcHx6uyS");

function getIncoAssociatedTokenAddress(
  wallet: PublicKey,
  mint: PublicKey,
  programId: PublicKey = INCO_TOKEN_PROGRAM_ID
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    programId
  );
  return addr;
}

function getAllowancePda(handle: bigint, allowedAddress: PublicKey): [PublicKey, number] {
  const handleBuffer = Buffer.alloc(16);
  let h = handle;
  for (let i = 0; i < 16; i++) {
    handleBuffer[i] = Number(h & BigInt(0xff));
    h = h >> BigInt(8);
  }
  return PublicKey.findProgramAddressSync(
    [handleBuffer, allowedAddress.toBuffer()],
    INCO_LIGHTNING_PROGRAM_ID
  );
}

function getPayerKeypair(): Keypair {
  const raw = process.env.PAYER_PRIVATE_KEY;
  if (!raw || raw.trim() === "") throw new Error("PAYER_PRIVATE_KEY not set in .env.local");
  const arr = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

async function main() {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const payer = getPayerKeypair();

  const wallet = {
    publicKey: payer.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(payer);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return txs.map((tx) => {
        tx.partialSign(payer);
        return tx;
      });
    },
  };
  const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlExists = fs.existsSync(path.join(process.cwd(), "lightning-rod-solana", "target", "idl", "inco_token.json"));
  const resolvedIdlPath = idlExists
    ? path.join(process.cwd(), "lightning-rod-solana", "target", "idl", "inco_token.json")
    : path.join(process.cwd(), "public", "idl", "inco_token.json");
  const idl = JSON.parse(fs.readFileSync(resolvedIdlPath, "utf-8"));
  if (!idl.address) idl.address = INCO_TOKEN_PROGRAM_ID.toBase58();
  const program = new anchor.Program(idl, provider);

  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const decimals = 9;

  console.log("1. Initialize IncoMint...");
  await program.methods
    .initializeMint(decimals, payer.publicKey, payer.publicKey)
    .accounts({
      mint,
      payer: payer.publicKey,
      systemProgram: SystemProgram.programId,
      incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
    } as any)
    .signers([mintKp])
    .rpc();
  console.log("   Mint:", mint.toBase58());

  const sourceAta = getIncoAssociatedTokenAddress(SOURCE_WALLET, mint);
  const destAta = getIncoAssociatedTokenAddress(RECIPIENT_WALLET, mint);

  console.log("2. Create IncoToken account for source wallet...");
  await program.methods
    .createIdempotent()
    .accounts({
      payer: payer.publicKey,
      associatedToken: sourceAta,
      wallet: SOURCE_WALLET,
      mint,
      systemProgram: SystemProgram.programId,
      incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
    } as any)
    .rpc();
  console.log("   Source ATA:", sourceAta.toBase58());

  console.log("3. Create IncoToken account for recipient wallet...");
  await program.methods
    .createIdempotent()
    .accounts({
      payer: payer.publicKey,
      associatedToken: destAta,
      wallet: RECIPIENT_WALLET,
      mint,
      systemProgram: SystemProgram.programId,
      incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
    } as any)
    .rpc();
  console.log("   Dest ATA:", destAta.toBase58());

  const mintAmount = BigInt(10_000_000_000); // 10 tokens (9 decimals)
  const encryptedHex = await encryptValue(mintAmount);

  console.log("4. Simulate mint_to to get balance handle...");
  const txForSim = await program.methods
    .mintTo(hexToBuffer(encryptedHex), 0)
    .accounts({
      mint,
      account: sourceAta,
      mintAuthority: payer.publicKey,
      incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as any)
    .transaction();

  const { blockhash } = await connection.getLatestBlockhash();
  txForSim.recentBlockhash = blockhash;
  txForSim.feePayer = payer.publicKey;
  const sim = await connection.simulateTransaction(txForSim, undefined, [sourceAta]);
  if (sim.value.err) {
    console.error("   Simulation failed:", sim.value.err);
    throw new Error("Mint simulation failed");
  }
  const data = sim.value.accounts?.[0]?.data;
  if (!data) throw new Error("No account data in simulation");
  const buf = Buffer.from(data[0], "base64");
  const amountBytes = buf.slice(72, 88);
  let handle = BigInt(0);
  for (let i = 15; i >= 0; i--) handle = handle * BigInt(256) + BigInt(amountBytes[i]);
  const [allowancePda] = getAllowancePda(handle, payer.publicKey);

  console.log("5. Mint tokens to source account...");
  await program.methods
    .mintTo(hexToBuffer(encryptedHex), 0)
    .accounts({
      mint,
      account: sourceAta,
      mintAuthority: payer.publicKey,
      incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as any)
    .remainingAccounts([
      { pubkey: allowancePda, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
    ])
    .rpc();
  console.log("   Minted 10 tokens to source ATA.");

  const envPath = path.join(process.cwd(), ".env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  const newLine = `NEXT_PUBLIC_TOKEN_MINT=${mint.toBase58()}`;
  if (envContent.includes("NEXT_PUBLIC_TOKEN_MINT=")) {
    envContent = envContent.replace(/NEXT_PUBLIC_TOKEN_MINT=.*/m, newLine);
  } else {
    envContent = envContent.trimEnd() + "\n" + newLine + "\n";
  }
  fs.writeFileSync(envPath, envContent);
  console.log("6. Updated .env.local with NEXT_PUBLIC_TOKEN_MINT=" + mint.toBase58());

  console.log("\nDone. You can use /test with:");
  console.log("  Source (your IncoToken account): auto-derived from wallet + mint");
  console.log("  Recipient wallet:", RECIPIENT_WALLET.toBase58());
  console.log("  Mint (IncoMint):", mint.toBase58());
  console.log("  Restart dev server (yarn dev) so it picks up the new NEXT_PUBLIC_TOKEN_MINT.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
