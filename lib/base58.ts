/**
 * Minimal base58 encode so we don't depend on bs58 package shape (v5 vs v6 default export).
 * Use for encoding tx signatures to Solscan-friendly base58 strings.
 */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(buffer: Uint8Array | Buffer): string {
  let num = 0n;
  const bytes = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
  for (let i = 0; i < bytes.length; i++) {
    num = num * 256n + BigInt(bytes[i]);
  }
  if (num === 0n) return ALPHABET[0];
  let s = "";
  while (num > 0n) {
    s = ALPHABET[Number(num % 58n)] + s;
    num = num / 58n;
  }
  return s;
}
