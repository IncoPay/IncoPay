"use client";

import React, { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  encryptAmount,
  getIncoAssociatedTokenAddress,
  hexToBuffer,
  INCO_LIGHTNING_PROGRAM_ID,
  INCO_TOKEN_PROGRAM_ID,
  getAllowancePda,
  simulateTransferAndGetHandles,
} from "../test/utils/confidentialTransfer";
import { encodeBase58 } from "../../lib/base58";
import WalletButton from "../components/WalletButton";
import Link from "next/link";

/** Normalize settle response to a Solscan-valid tx signature (base58). If value is base64 serialized tx, extract first signature. */
function getSolscanTxSignature(value: string): string {
  if (!value) return value;
  if (value.length <= 100 && !value.includes("+") && !value.includes("/") && !value.includes("=")) {
    return value;
  }
  try {
    const buf = Buffer.from(value, "base64");
    if (buf.length < 65) return value;
    const tx = VersionedTransaction.deserialize(new Uint8Array(buf));
    const sig = tx.signatures[0];
    if (sig?.length === 64) return encodeBase58(sig);
    return encodeBase58(buf.subarray(1, 65));
  } catch {
    return value;
  }
}

const FACILITATOR_URL = process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3001";
const DEMO_PRICE = 1; // 1 INCO token for the box
const DECIMALS = 9;
/** Default merchant/receiver wallet for 1 INCO payment (IncoToken account owner). */
const DEFAULT_PAYMENT_RECEIVER = "E9cRHNKU5wWVtovCRsSwnL1zvmVsLjiHrtQvRcHx6uyS";

export default function Test2Page() {
  const { connection } = useConnection();
  const { publicKey, signMessage, signTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [apiData, setApiData] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string>("");

  const handlePay = async () => {
    if (!publicKey || !signMessage) {
      setStatus("Please connect your wallet");
      return;
    }

    const mintStr = process.env.NEXT_PUBLIC_TOKEN_MINT;
    const paymentReceiverStr = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER || DEFAULT_PAYMENT_RECEIVER;
    if (!mintStr) {
      setStatus("Missing NEXT_PUBLIC_TOKEN_MINT. Set it to your IncoToken mint address.");
      return;
    }

    let mint: PublicKey;
    let paymentReceiver: PublicKey;
    try {
      mint = new PublicKey(mintStr);
      paymentReceiver = new PublicKey(paymentReceiverStr);
    } catch (e: any) {
      setStatus(`Invalid address: ${e?.message}`);
      return;
    }

    setLoading(true);
    setApiData(null);
    setTxSignature("");

    try {
      // 1) Query server for payment (demo: fixed 1 token)
      setStatus(`Price: ${DEMO_PRICE} INCO token. Fetching ciphertext from facilitator...`);
      let getAmountRes: Response;
      try {
        getAmountRes = await fetch(`${FACILITATOR_URL}/getAmount`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: DEMO_PRICE, decimals: DECIMALS }),
        });
      } catch (fetchErr: any) {
        throw new Error(
          `Cannot reach facilitator at ${FACILITATOR_URL}. ` +
            "Make sure it's running: run `yarn facilitator` in a separate terminal. " +
            "If Next.js uses port 3000, set FACILITATOR_PORT=3001 in .env.local for the facilitator. " +
            (fetchErr?.message || "Failed to fetch")
        );
      }
      if (!getAmountRes.ok) {
        const err = await getAmountRes.json().catch(() => ({}));
        throw new Error(err?.error || `getAmount failed: ${getAmountRes.status}`);
      }
      const { ciphertext } = (await getAmountRes.json()) as { ciphertext: string };
      setStatus("Ciphertext received. Sign the payment message in your wallet...");

      // 2) Build message and sign (user signs message with encrypted amount)
      const messagePayload = {
        ciphertext: ciphertext.substring(0, 32) + "...",
        amount: DEMO_PRICE,
        decimals: DECIMALS,
        recipient: paymentReceiverStr,
        network: "solana:devnet",
        nonce: Date.now().toString(),
      };
      const messageStr = JSON.stringify(messagePayload);
      const messageBytes = new TextEncoder().encode(messageStr);
      const signature = await signMessage(messageBytes);
      const signatureBase64 = typeof signature === "string" ? signature : Buffer.from(signature).toString("base64");

      // 3) Verify with facilitator (fast off-chain check; on-chain verification happens in settle tx)
      setStatus("Verifying signature at facilitator...");
      const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPayload: {
            payload: {
              signature: signatureBase64,
              message: messageStr,
              ciphertext,
              payer: publicKey.toBase58(),
              sourceAccount: getIncoAssociatedTokenAddress(publicKey, mint, INCO_TOKEN_PROGRAM_ID).toBase58(),
              destAccount: getIncoAssociatedTokenAddress(paymentReceiver, mint, INCO_TOKEN_PROGRAM_ID).toBase58(),
              mint: mintStr,
            },
          },
          paymentRequirements: { network: "solana:devnet", price: `$${DEMO_PRICE}` },
        }),
      });
      const verifyData = (await verifyRes.json()) as { isValid?: boolean; invalidReason?: string };
      if (!verifyData.isValid) {
        throw new Error(verifyData.invalidReason || "Verification failed");
      }
      setStatus("Getting handles via simulation (no transaction signing)...");

      // 4) Get handles via simulation only (no tx build/sign – facilitator will build and send)
      const provider = new anchor.AnchorProvider(
        connection,
        { publicKey, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
        { commitment: "confirmed" }
      );
      anchor.setProvider(provider);

      let program: anchor.Program;
      const programId = INCO_TOKEN_PROGRAM_ID;
      try {
        program = await anchor.Program.at(programId, provider);
      } catch {
        const idlRes = await fetch("/idl/inco_token.json");
        if (!idlRes.ok) throw new Error("IDL not found");
        const idl = await idlRes.json();
        if (!idl.address) idl.address = programId.toBase58();
        program = new anchor.Program(idl, provider);
      }

      const sourcePubkey = getIncoAssociatedTokenAddress(publicKey, mint, INCO_TOKEN_PROGRAM_ID);
      const destPubkey = getIncoAssociatedTokenAddress(paymentReceiver, mint, INCO_TOKEN_PROGRAM_ID);

      const txForSim = await program.methods
        .transfer(hexToBuffer(ciphertext), 0)
        .accounts({
          source: sourcePubkey,
          destination: destPubkey,
          authority: publicKey,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .transaction();

      const simResult = await simulateTransferAndGetHandles(
        txForSim,
        connection,
        sourcePubkey,
        destPubkey,
        publicKey
      );
      if (!simResult.sourceHandle || !simResult.destHandle) {
        const hint = simResult.error
          ? ` ${simResult.error}`
          : "";
        throw new Error(
          `Simulation failed.${hint} Ensure: (1) Your wallet has an IncoToken account for this mint with at least ${DEMO_PRICE} INCO, (2) Payment receiver has an IncoToken account, (3) RPC is reachable (no 403).`
        );
      }
      const { sourceHandle, destHandle } = simResult;

      // 5) Settle: facilitator returns unsigned tx; you sign the transaction once (required by protocol so facilitator can complete payment on your behalf); then we send it.
      setStatus("Requesting payment transaction...");
      const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPayload: {
            payload: {
              authorization: {
                message: messageStr,
                signature: signatureBase64,
                payer: publicKey.toBase58(),
                ciphertext,
                mint: mintStr,
                paymentReceiver: paymentReceiverStr,
                sourceHandle: sourceHandle.toString(),
                destHandle: destHandle.toString(),
              },
            },
          },
          paymentRequirements: { network: "solana:devnet", price: `$${DEMO_PRICE}` },
        }),
      });
      const settleData = (await settleRes.json()) as {
        success?: boolean;
        transaction?: string;
        errorReason?: string;
        requiresPayerSignature?: boolean;
        unsignedTransaction?: string;
      };

      let solscanSig = "";
      if (settleData.requiresPayerSignature && settleData.unsignedTransaction) {
        if (!signTransaction) {
          throw new Error("Wallet does not support signing transactions.");
        }
        setStatus("Sign the transaction once so the facilitator can complete the payment on your behalf...");
        const raw = settleData.unsignedTransaction;
        const buf = typeof atob !== "undefined" ? Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)) : Buffer.from(raw, "base64");
        const tx = Transaction.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
        
        let signedTx;
        try {
          signedTx = await signTransaction(tx);
        } catch (signErr: any) {
          const errMsg = signErr?.message || String(signErr);
          if (errMsg.includes("Missing signature") || errMsg.includes("Signature verification failed")) {
            throw new Error(`Wallet signature error: ${errMsg}. This may indicate the wallet is checking signatures before allowing you to sign. Try refreshing and retrying.`);
          }
          throw signErr;
        }
        
        // Must use requireAllSignatures: false because fee payer hasn't signed yet
        const signedTxBase64 = Buffer.from(signedTx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64");

        setStatus("Submitting signed payment...");
        const settleRes2 = await fetch(`${FACILITATOR_URL}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentPayload: { payload: { transaction: signedTxBase64 } },
            paymentRequirements: { network: "solana:devnet", price: `$${DEMO_PRICE}` },
          }),
        });
        const settleData2 = (await settleRes2.json()) as { success?: boolean; transaction?: string; errorReason?: string };
        if (!settleData2.success) {
          const reason = settleData2.errorReason?.trim() || "Settle failed.";
          throw new Error(reason);
        }
        solscanSig = getSolscanTxSignature(settleData2.transaction || "");
        setTxSignature(solscanSig);
        setStatus("Payment settled. Revealing API data...");
      } else if (settleData.success && settleData.transaction) {
        solscanSig = getSolscanTxSignature(settleData.transaction || "");
        setTxSignature(solscanSig);
        setStatus("Payment settled. Revealing API data...");
      } else {
        const reason = settleData.errorReason?.trim() || "Settle failed.";
        throw new Error(reason);
      }

      // 6) Reveal API data (mock for demo) – use normalized signature for Solscan link
      const mockApiData = {
        unlocked: true,
        message: "Payment verified. You paid 1 INCO token (confidential).",
        txSignature: solscanSig,
        timestamp: new Date().toISOString(),
      };
      setApiData(JSON.stringify(mockApiData, null, 2));
      setStatus("Done! Payment verified and settled. API data revealed below.");
    } catch (error: any) {
      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        setStatus("Signing cancelled by user.");
      } else {
        setStatus(`Error: ${error?.message || String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--button-bg)] flex items-center justify-center">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" />
              <circle cx="9" cy="12" r="1.5" fill="currentColor" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <Link href="/" className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-serif hover:opacity-80">
            IncoPay
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <WalletButton />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] font-serif">
              X402 Demo – Pay with 1 INCO
            </h1>
            <Link href="/test" className="px-4 py-2 bg-[#2463EB] text-white rounded-lg hover:bg-[#1d4ed8] text-sm">
              Confidential Transfer →
            </Link>
          </div>

          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] font-serif mb-2">
              Unlock this box
            </h2>
            <p className="text-[var(--text-paragraph)] font-sans mb-4">
              This box requires <strong>1 INCO</strong> confidential token. You sign the message first (authorization), then sign the transaction once when prompted so the facilitator can complete the payment on your behalf.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-sans mb-4">
              Run the facilitator first: <code className="bg-black/20 px-1 rounded">yarn facilitator</code> (port 3001). Otherwise you’ll get &quot;Failed to fetch&quot;.
            </p>
            {!connected && (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-sans mb-4">
                Connect your wallet to pay.
              </p>
            )}
            <button
              onClick={handlePay}
              disabled={loading || !connected}
              className="w-full px-6 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Pay 1 INCO"}
            </button>
          </div>

          {status && (
            <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] font-serif mb-2">Status</h3>
              <p className="text-sm text-[var(--text-paragraph)] whitespace-pre-wrap font-sans">{status}</p>
              {txSignature && (
                <a
                  href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[var(--button-bg)] hover:underline text-sm"
                >
                  View on Solscan
                </a>
              )}
            </div>
          )}

          {apiData && (
            <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] font-serif mb-2">API data (revealed)</h3>
              <pre className="text-xs text-[var(--text-paragraph)] font-mono overflow-auto max-h-64 p-3 bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
                {apiData}
              </pre>
            </div>
          )}

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] font-serif mb-3">Flow (X402)</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-paragraph)] font-sans">
              <li>Query server for payment → price: 1 INCO</li>
              <li>Get ciphertext for that amount from facilitator (<code className="bg-black/20 px-1 rounded">/getAmount</code>)</li>
              <li><strong>Sign message only</strong> (with encrypted amount) – no transaction signing</li>
              <li>Facilitator verifies your signature (<code className="bg-black/20 px-1 rounded">/verify</code>)</li>
              <li>Facilitator builds tx: [Ed25519 verify, transfer_with_authorization], signs (fee payer), and settles (<code className="bg-black/20 px-1 rounded">/settle</code>)</li>
              <li>API data revealed</li>
            </ol>
            <p className="mt-2 text-xs text-[var(--text-paragraph)] font-sans">
              User only signs a message; the facilitator builds and submits the transaction. Ed25519 verification runs on-chain before the IncoToken transfer.
            </p>
            <p className="mt-4 text-xs text-[var(--text-paragraph)] font-sans">
              Ensure facilitator is running: <code className="bg-black/20 px-1 rounded">yarn facilitator</code> (port 3001). Payments go to merchant <code className="bg-black/20 px-1 rounded">{DEFAULT_PAYMENT_RECEIVER}</code> unless <code className="bg-black/20 px-1 rounded">NEXT_PUBLIC_PAYMENT_RECEIVER</code> is set.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
