"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  getIncoAssociatedTokenAddress,
  hexToBuffer,
  INCO_LIGHTNING_PROGRAM_ID,
  INCO_TOKEN_PROGRAM_ID,
  simulateTransferAndGetHandles,
} from "../test/utils/confidentialTransfer";
import { encodeBase58 } from "../../lib/base58";
import { BackgroundBeams } from "../components/background-beams";
import WalletButton from "../components/WalletButton";
import Plasma from "@/components/Plasma";

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

const FACILITATOR_URL = "https://inco-facilitator-production.up.railway.app";
const DEMO_PRICE = 1;
const DECIMALS = 6; // Our Inco-USDC mint is 6 decimals (matches Circle USDC convention)
// Merchant for the demo. Must have an IncoAccount on TOKEN_MINT.
const DEFAULT_PAYMENT_RECEIVER = "55LEmvuVgujxEvbrYBiDXBZmMxu3dMofVvT6uCq4q2xK";

const COLORS = {
  BACKGROUND: "#0A0A0A",
  BOX_BG: "#020408",
  BLUE_PRIMARY: "#2463EB",
  BLUE_ACCENT: "#60A5FA",
  BLUE_DARK: "#1E3A8A",
  GLOW_BLUE: "#3B82F6",
  TEXT_COLOR_DIM: "#9CA3AF",
};

const customStyles = `
  .token-box-frame {
    clip-path: polygon(2% 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%);
    border: 3px solid ${COLORS.BLUE_PRIMARY};
    background: linear-gradient(135deg, ${COLORS.BOX_BG} 0%, #050a14 100%);
    position: relative;
    z-index: 10;
    box-shadow: 0 0 20px rgba(36, 99, 235, 0.3), 0 0 40px rgba(59, 130, 246, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.5);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: pulse-glow-blue 3s ease-in-out infinite;
  }
  .token-box-frame:hover {
    border-color: ${COLORS.GLOW_BLUE};
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 0 0 60px rgba(37, 99, 235, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.5);
    transform: translateY(-4px);
  }
  .token-box-frame::before {
    content: '';
    position: absolute;
    top: 4px; left: 4px; right: 4px; bottom: 4px;
    border: 2px solid ${COLORS.BLUE_DARK};
    pointer-events: none;
    z-index: 1;
    clip-path: polygon(2% 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%);
  }
  .swap-button-style {
    clip-path: polygon(2% 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%);
    border: 2px solid ${COLORS.BLUE_PRIMARY};
    background: linear-gradient(135deg, ${COLORS.BOX_BG} 0%, #050a14 100%);
    box-shadow: 0 0 20px rgba(36, 99, 235, 0.3), 0 0 40px rgba(59, 130, 246, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.5);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  }
  .swap-button-style:hover:not(:disabled) {
    border-color: ${COLORS.GLOW_BLUE};
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
    transform: translateY(-4px);
  }
  .corner-accent {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 2px solid ${COLORS.BLUE_PRIMARY};
    z-index: 30;
  }
  .corner-accent.top-left { top: -2px; left: -2px; border-right: none; border-bottom: none; }
  .corner-accent.top-right { top: -2px; right: -2px; border-left: none; border-bottom: none; }
  .corner-accent.bottom-left { bottom: -2px; left: -2px; border-right: none; border-top: none; }
  .corner-accent.bottom-right { bottom: -2px; right: -2px; border-left: none; border-top: none; }
  .deco-stripes { position: absolute; top: 8px; left: 8px; width: 40px; height: 12px; overflow: hidden; z-index: 20; }
  .deco-stripes div { float: left; width: 4px; height: 100%; background: linear-gradient(180deg, ${COLORS.BLUE_PRIMARY} 0%, ${COLORS.BLUE_ACCENT} 100%); margin-right: 3px; opacity: 0.5; transform: skewX(-25deg); }
  @keyframes pulse-glow-blue {
    0%, 100% { box-shadow: 0 0 20px rgba(36, 99, 235, 0.3), 0 0 40px rgba(59, 130, 246, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.5); }
    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(37, 99, 235, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.5); }
  }
`;

export default function Started() {
  const { connection } = useConnection();
  const { publicKey, signMessage, signTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [apiData, setApiData] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string>("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handlePay = async () => {
    if (!publicKey || !signMessage) {
      setStatus("Please connect your wallet");
      return;
    }
    const mintStr = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
    const paymentReceiverStr = "55LEmvuVgujxEvbrYBiDXBZmMxu3dMofVvT6uCq4q2xK";
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
      setStatus(`Price: ${DEMO_PRICE} USDC. Fetching ciphertext...`);
      const getAmountRes = await fetch(`${FACILITATOR_URL}/pay/getAmount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: DEMO_PRICE, decimals: DECIMALS }),
      });
      if (!getAmountRes.ok) {
        const err = await getAmountRes.json().catch(() => ({}));
        throw new Error(err?.error || `getAmount failed: ${getAmountRes.status}`);
      }
      const { ciphertext } = (await getAmountRes.json()) as { ciphertext: string };
      setStatus("Sign the payment message in your wallet...");
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
      setStatus("Verifying signature...");
      const verifyRes = await fetch(`${FACILITATOR_URL}/pay/verify`, {
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
      if (!verifyData.isValid) throw new Error(verifyData.invalidReason || "Verification failed");
      setStatus("Getting handles via simulation...");
      const provider = new anchor.AnchorProvider(
        connection,
        { publicKey, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
        { commitment: "confirmed" }
      );
      anchor.setProvider(provider);
      let program: anchor.Program;
      try {
        program = await anchor.Program.at(INCO_TOKEN_PROGRAM_ID, provider);
      } catch {
        const idlRes = await fetch("/idl/inco_token.json");
        if (!idlRes.ok) throw new Error("IDL not found");
        const idl = await idlRes.json();
        if (!idl.address) idl.address = INCO_TOKEN_PROGRAM_ID.toBase58();
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
      const simResult = await simulateTransferAndGetHandles(txForSim, connection, sourcePubkey, destPubkey, publicKey);
      if (!simResult.sourceHandle || !simResult.destHandle) {
        throw new Error(
          `Simulation failed.${simResult.error || ""} Ensure: IncoToken accounts exist and source has ≥ ${DEMO_PRICE} USDC.`
        );
      }
      const { sourceHandle, destHandle } = simResult;
      setStatus("Requesting payment transaction...");
      const settleRes = await fetch(`${FACILITATOR_URL}/pay/settle`, {
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
        if (!signTransaction) throw new Error("Wallet does not support signing transactions.");
        setStatus("Sign the transaction once so the facilitator can complete the payment...");
        const raw = settleData.unsignedTransaction;
        const buf = typeof atob !== "undefined" ? Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)) : Buffer.from(raw, "base64");
        const tx = Transaction.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
        let signedTx;
        try {
          signedTx = await signTransaction(tx);
        } catch (signErr: any) {
          throw signErr;
        }
        const signedTxBase64 = Buffer.from(
          signedTx.serialize({ requireAllSignatures: false, verifySignatures: false })
        ).toString("base64");
        setStatus("Submitting signed payment...");
        const settleRes2 = await fetch(`${FACILITATOR_URL}/pay/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentPayload: { payload: { transaction: signedTxBase64 } },
            paymentRequirements: { network: "solana:devnet", price: `$${DEMO_PRICE}` },
          }),
        });
        const settleData2 = (await settleRes2.json()) as { success?: boolean; transaction?: string; errorReason?: string };
        if (!settleData2.success) throw new Error(settleData2.errorReason?.trim() || "Settle failed.");
        solscanSig = getSolscanTxSignature(settleData2.transaction || "");
        setTxSignature(solscanSig);
        setStatus("Payment settled. Revealing API data...");
      } else if (settleData.success && settleData.transaction) {
        solscanSig = getSolscanTxSignature(settleData.transaction || "");
        setTxSignature(solscanSig);
        setStatus("Payment settled. Revealing API data...");
      } else {
        throw new Error(settleData.errorReason?.trim() || "Settle failed.");
      }
      const mockApiData = {
        unlocked: true,
        message: "Payment verified. You paid 1 USDC token (confidential).",
        txSignature: solscanSig,
        timestamp: new Date().toISOString(),
      };
      setApiData(JSON.stringify(mockApiData, null, 2));
      setStatus("Done! Payment verified and settled.");
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("User rejected") || msg.includes("User denied")) {
        setStatus("Signing cancelled by user.");
      } else if (/already been processed/i.test(msg)) {
        const mockApiData = {
          unlocked: true,
          message: "Payment already settled. You paid 1 USDC token (confidential).",
          timestamp: new Date().toISOString(),
        };
        setApiData(JSON.stringify(mockApiData, null, 2));
        setStatus("Already paid — content unlocked.");
      } else {
        setStatus(`Error: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="min-h-screen bg-[var(--bg-primary)] flex">
        <div className="w-1/2 relative flex flex-col px-8 py-6 sm:px-12 sm:py-8">
          <div className="w-full flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--button-bg)] flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="white" strokeWidth="1.5" fill="none" />
                  <circle cx="12" cy="14" r="1.5" fill="white" />
                  <circle cx="9" cy="12" r="1.5" fill="white" />
                  <circle cx="15" cy="12" r="1.5" fill="white" />
                </svg>
              </div>
              <Link href="/" className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-serif hover:opacity-80 transition-opacity cursor-pointer">
                IncoPay
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-2 sm:gap-3 text-sm">
                <Link
                  href="/started"
                  className="px-3 sm:px-4 py-2 rounded-lg text-white font-medium bg-white/5 border border-white/10"
                >
                  Get Started
                </Link>
                <Link
                  href="/sessions"
                  className="px-4 sm:px-5 py-2 rounded-lg bg-[#2463EB] text-white font-medium hover:bg-[#1d4ed8] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#2463EB]/30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Sessions
                </Link>
                <Link
                  href="/slot"
                  className="px-4 sm:px-5 py-2 rounded-lg bg-[#2463EB] text-white font-medium hover:bg-[#1d4ed8] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#2463EB]/30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  Slot
                </Link>
              </nav>
              <WalletButton />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] font-serif">
              402 Premium Content
            </h2>

            <div className="token-box-frame p-8 w-full max-w-lg relative">
              <div className="deco-stripes"><div /><div /><div /><div /><div /></div>
              <div className="corner-accent top-left" />
              <div className="corner-accent top-right" />
              <div className="corner-accent bottom-left" />
              <div className="corner-accent bottom-right" />

              <div className="relative z-20 space-y-4">
                <p className="text-[10px] sm:text-xs font-sans text-emerald-400/90">
                  Facilitator should be running. We are on devnet.
                </p>
                <p className="text-base sm:text-lg font-sans" style={{ color: COLORS.TEXT_COLOR_DIM }}>
                  Access exclusive content through confidential x402.
                </p>
                {!connected && (
                  <p className="text-sm font-sans" style={{ color: COLORS.TEXT_COLOR_DIM }}>
                    Connect your wallet to pay.
                  </p>
                )}
                <button
                  onClick={handlePay}
                  disabled={loading || !connected}
                  className="swap-button-style w-full py-3 px-6 text-xl font-bold text-white text-center relative rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Pay 1 USDC"}
                </button>
                {status && (
                  <p className="text-sm font-sans whitespace-pre-wrap" style={{ color: COLORS.TEXT_COLOR_DIM }}>
                    {status}
                  </p>
                )}
                {txSignature && (
                  <a
                    href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-sans text-[var(--button-bg)] hover:underline"
                  >
                    View on Solscan
                  </a>
                )}
                {apiData && (
                  <pre className="text-xs font-mono overflow-auto max-h-32 p-3 rounded border border-[var(--border-color)] bg-black/40" style={{ color: COLORS.TEXT_COLOR_DIM }}>
                    {apiData}
                  </pre>
                )}
              </div>

              {/* Bottom: dot-effect circle + SECURE / ENCRYPTED */}
              <div className="flex justify-between items-end relative z-20 pt-4 mt-4">
                <div className="dot-effect">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="text-xs font-mono opacity-40" style={{ color: COLORS.BLUE_PRIMARY }}>
                  <div>SECURE</div>
                  <div className="text-right">ENCRYPTED</div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-lg flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowHowItWorks(true)}
                className="px-5 py-2.5 text-[var(--button-bg)] font-medium rounded-lg border-2 border-[#2463EB] bg-black/30 backdrop-blur-sm hover:bg-[#2463EB] hover:text-white hover:border-[#60A5FA] hover:shadow-[0_0_20px_rgba(36,99,235,0.5)] transition-all duration-300"
              >
                How it works
              </button>
            </div>
          </div>
        </div>

        <div className="w-1/2 h-screen rounded-md bg-black relative antialiased overflow-hidden">
          <div className="absolute inset-0 w-full h-full">
            <Plasma color="#2463EB" speed={0.6} direction="forward" scale={1.0} opacity={1} mouseInteractive={true} />
          </div>
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <div className="max-w-2xl mx-auto p-4">
              <div className="space-y-2 sm:space-y-4 ml-4 sm:ml-8">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2463EB] drop-shadow-lg">Private.</h2>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2463EB] drop-shadow-lg">Anonymous.</h2>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2463EB] drop-shadow-lg">Unlinkable.</h2>
              </div>
              <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-white flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full font-sans flex-wrap bg-black/40 backdrop-blur-sm leading-relaxed max-w-lg">
                Welcome to the world of private transaction. Everything you need is privacy and we are here to help you with this.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="bg-[var(--bg-box)] rounded-xl p-6 max-w-lg w-full shadow-2xl border-2 border-[#2463EB] shadow-[0_0_40px_rgba(36,99,235,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[var(--text-primary)] font-serif mb-4">How it works</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-paragraph)] font-sans mb-4">
              <li>Connect wallet and click Pay 1 USDC</li>
              <li>Get ciphertext for the amount from facilitator (<code className="bg-black/20 px-1 rounded">/getAmount</code>)</li>
              <li>Sign the payment message (authorization with encrypted amount)</li>
              <li>Facilitator verifies your signature (<code className="bg-black/20 px-1 rounded">/verify</code>)</li>
              <li>Facilitator returns an unsigned transaction – you sign it once when prompted</li>
              <li>Client sends signed tx to facilitator → Kora adds fee payer signature and submits</li>
              <li>Payment settled – API data revealed, Solscan link shown</li>
            </ol>
            <p className="text-xs text-[var(--text-paragraph)] font-sans mb-4">
              You sign the message first (authorization), then sign the transaction once so the facilitator can complete the payment on your behalf. Kora pays gas fees.
            </p>
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className="w-full py-2.5 bg-[var(--button-bg)] text-white font-medium rounded-lg hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
