/**
 * Stub types for @solana/kora when the package is not installed (e.g. Vercel UI-only deploy).
 * For full facilitator (with Kora), install the real SDK: yarn add file:../kora/sdks/ts
 * or use the Kora repo as sibling and run yarn kora:build-sdk.
 */
declare module "@solana/kora" {
  export class KoraClient {
    constructor(options: { rpcUrl: string; apiKey: string });
    getBlockhash(): Promise<{ blockhash: string }>;
    getPayerSigner(): Promise<{ signer_address: string }>;
    signTransaction(params: { transaction: string }): Promise<{ signed_transaction: string }>;
    signAndSendTransaction(params: {
      transaction: string;
      sig_verify?: boolean;
    }): Promise<{ transaction_signature?: string; signed_transaction?: string }>;
  }
}
