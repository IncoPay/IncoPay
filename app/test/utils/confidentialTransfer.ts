import { PublicKey, SystemProgram, Connection, Transaction } from "@solana/web3.js";
import { encryptValue } from "@inco/solana-sdk/encryption";
import { decrypt } from "@inco/solana-sdk/attested-decrypt";
import { hexToBuffer } from "@inco/solana-sdk/utils";
import * as anchor from "@coral-xyz/anchor";
import nacl from "tweetnacl";

export { hexToBuffer };

export const INCO_LIGHTNING_PROGRAM_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");
// Program ID - will be updated after deployment
// Original: 4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N
// New (from build): 9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi
export const INCO_TOKEN_PROGRAM_ID = new PublicKey("9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi");

export function extractHandleFromAnchor(anchorHandle: any): bigint {
  if (anchorHandle && anchorHandle._bn) {
    return BigInt(anchorHandle._bn.toString(10));
  }
  if (typeof anchorHandle === 'object' && anchorHandle["0"]) {
    const nested = anchorHandle["0"];
    if (nested && nested._bn) return BigInt(nested._bn.toString(10));
    if (nested && nested.toString && nested.constructor?.name === 'BN') {
      return BigInt(nested.toString(10));
    }
  }
  if (anchorHandle instanceof Uint8Array || Array.isArray(anchorHandle)) {
    const buffer = Buffer.from(anchorHandle);
    let result = BigInt(0);
    for (let i = buffer.length - 1; i >= 0; i--) {
      result = result * BigInt(256) + BigInt(buffer[i]);
    }
    return result;
  }
  if (typeof anchorHandle === 'number' || typeof anchorHandle === 'bigint') {
    return BigInt(anchorHandle);
  }
  return BigInt(0);
}

export function getAllowancePda(handle: bigint, allowedAddress: PublicKey): [PublicKey, number] {
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

export function formatBalance(plaintext: string, decimals: number = 9): string {
  return (Number(plaintext) / Math.pow(10, decimals)).toFixed(decimals);
}

export async function simulateTransferAndGetHandles(
  tx: Transaction,
  connection: Connection,
  sourcePubkey: PublicKey,
  destPubkey: PublicKey,
  walletPubkey: PublicKey
): Promise<{ sourceHandle: bigint | null; destHandle: bigint | null }> {
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletPubkey;

    const simulation = await connection.simulateTransaction(tx, undefined, [sourcePubkey, destPubkey]);
    if (simulation.value.err) return { sourceHandle: null, destHandle: null };

    const extractHandle = (accountData: any): bigint | null => {
      if (!accountData?.data) return null;
      const data = Buffer.from(accountData.data[0], "base64");
      const amountBytes = data.slice(72, 88);
      let handle = BigInt(0);
      for (let i = 15; i >= 0; i--) {
        handle = handle * BigInt(256) + BigInt(amountBytes[i]);
      }
      return handle;
    };

    return {
      sourceHandle: extractHandle(simulation.value.accounts?.[0]),
      destHandle: extractHandle(simulation.value.accounts?.[1]),
    };
  } catch {
    return { sourceHandle: null, destHandle: null };
  }
}

export async function decryptHandle(
  handle: string,
  walletPubkey: PublicKey,
  secretKey?: Uint8Array
): Promise<{ success: boolean; plaintext?: string; error?: string }> {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const result = await decrypt([handle], {
      address: walletPubkey,
      signMessage: async (message: Uint8Array) => {
        if (secretKey) {
          return nacl.sign.detached(message, secretKey);
        }
        throw new Error("Secret key required for signing");
      },
    });
    return { success: true, plaintext: result.plaintexts[0] };
  } catch (error: any) {
    const msg = error.message || error.toString();
    if (msg.toLowerCase().includes("not allowed")) return { success: false, error: "not_allowed" };
    if (msg.toLowerCase().includes("ciphertext")) return { success: false, error: "ciphertext_not_found" };
    return { success: false, error: msg };
  }
}

export async function encryptAmount(amount: number, decimals: number = 9): Promise<string> {
  const amountBigInt = BigInt(Math.floor(amount * Math.pow(10, decimals)));
  return await encryptValue(amountBigInt);
}
