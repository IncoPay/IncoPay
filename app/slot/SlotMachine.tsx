"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Coins,
  TrendingUp,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import {
  createSession,
  wrapFetch,
  type SessionHandle,
  type ClientSvmSigner,
  type Network,
} from "solana-x402-sessions";
import WalletButton from "../components/WalletButton";

const FACILITATOR_URL = "https://inco-facilitator-production.up.railway.app";
const RPC_URL = "https://api.devnet.solana.com";
const MINT = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
const RECIPIENT = "55LEmvuVgujxEvbrYBiDXBZmMxu3dMofVvT6uCq4q2xK";
const NETWORK: Network = "solana:devnet";
const PER_PULL_USDC = 0.1;
const PER_PULL_BASE_UNITS = 100_000n;
const DECIMALS = 6;

const LS_KEY = "inco-x402-slot-session:v1";

interface PersistedSession {
  sessionId: string;
  user: string;
  spender: string;
  asset: string;
  recipient: string;
  cap: string;
  expirationUnix: number;
  network: Network;
  facilitatorUrl: string;
}

function loadStored(walletPubkey: string): PersistedSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: PersistedSession = JSON.parse(raw);
    if (parsed.user !== walletPubkey) return null;
    if (parsed.expirationUnix * 1000 < Date.now()) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeSession(s: SessionHandle) {
  const copy: PersistedSession = {
    sessionId: s.sessionId,
    user: s.user,
    spender: s.spender,
    asset: s.asset,
    recipient: s.recipient,
    cap: s.cap,
    expirationUnix: s.expirationUnix,
    network: s.network,
    facilitatorUrl: s.facilitatorUrl,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(copy));
}

type PullResult = {
  reels: [string, string, string];
  win: boolean;
  multiplier: number;
  payoutLabel: string;
};

const PLACEHOLDER_REELS: [string, string, string] = ["❓", "❓", "❓"];

function baseUnitsToUsdc(units: string | bigint): number {
  const bi = typeof units === "bigint" ? units : BigInt(units);
  const TEN_6 = 1_000_000n;
  const whole = Number(bi / TEN_6);
  const frac = Number(bi % TEN_6) / 1_000_000;
  return whole + frac;
}

export function SlotMachine() {
  const { publicKey, signMessage, signTransaction } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  const [session, setSession] = useState<SessionHandle | null>(null);
  const [authAmount, setAuthAmount] = useState<"1" | "2" | "manual">("1");
  const [manualAmount, setManualAmount] = useState("5");
  const [spent, setSpent] = useState(0);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [reels, setReels] = useState<[string, string, string]>(PLACEHOLDER_REELS);
  const [spinningReels, setSpinningReels] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const [lastResult, setLastResult] = useState<PullResult | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pulls, setPulls] = useState(0);
  const [wins, setWins] = useState(0);
  const [biggestMultiplier, setBiggestMultiplier] = useState(0);

  const cap =
    authAmount === "manual"
      ? parseFloat(manualAmount || "0")
      : parseFloat(authAmount);
  const displayedCap = session ? baseUnitsToUsdc(session.cap) : cap;
  const remaining = Math.max(0, displayedCap - spent);
  const canPull = session !== null && remaining >= PER_PULL_USDC && !isPulling;

  const createSvmSigner = useMemo((): ClientSvmSigner | null => {
    if (!publicKey || !signMessage || !signTransaction) return null;
    return {
      publicKey: publicKey.toBase58(),
      signMessage: async (msg: Uint8Array) => signMessage(msg),
      signTransaction: async (txB64: string) => {
        const tx = Transaction.from(Buffer.from(txB64, "base64"));
        const signed = await signTransaction(tx);
        return (signed as Transaction)
          .serialize({ requireAllSignatures: false, verifySignatures: false })
          .toString("base64");
      },
    };
  }, [publicKey, signMessage, signTransaction]);

  async function handleAuthorize() {
    setErrorMsg(null);
    if (!walletAddress) {
      setErrorMsg("Connect your Solana wallet first");
      return;
    }
    if (!MINT || !RECIPIENT) {
      setErrorMsg(
        "Missing env: NEXT_PUBLIC_TOKEN_MINT / NEXT_PUBLIC_RECIPIENT_PUBKEY"
      );
      return;
    }
    if (!isFinite(cap) || cap <= 0) {
      setErrorMsg("Cap must be a positive number");
      return;
    }
    if (!createSvmSigner) {
      setErrorMsg("Wallet does not expose signMessage / signTransaction");
      return;
    }

    setIsAuthorizing(true);
    try {
      const s = await createSession({
        facilitatorUrl: FACILITATOR_URL,
        network: NETWORK,
        asset: MINT,
        recipient: RECIPIENT,
        cap: cap.toString(),
        expirationSeconds: 3600,
        signer: createSvmSigner,
        solanaRpcUrl: RPC_URL,
        decimals: DECIMALS,
      });
      setSession(s);
      storeSession(s);
      setSpent(0);
      setPulls(0);
      setWins(0);
      setBiggestMultiplier(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAuthorizing(false);
    }
  }

  async function handlePull() {
    if (!canPull || !session) return;
    setErrorMsg(null);
    setIsPulling(true);
    setSpinningReels([true, true, true]);
    setLastResult(null);

    try {
      const res = await session.fetch("/slot/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const paymentRespB64 = res.headers.get("payment-response");
        if (paymentRespB64) {
          try {
            const decoded = JSON.parse(
              typeof Buffer !== "undefined"
                ? Buffer.from(paymentRespB64, "base64").toString("utf-8")
                : decodeURIComponent(escape(atob(paymentRespB64)))
            ) as { errorReason?: string; errorMessage?: string };
            const reason = decoded.errorReason ?? "unknown";
            const msg = (decoded.errorMessage ?? "").split("\n")[0];
            throw new Error(`${reason}${msg ? ": " + msg : ""}`);
          } catch (e) {
            if (e instanceof Error && e.message.includes(":")) throw e;
          }
        }
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`pull ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as PullResult;
      setSpent((s) => s + PER_PULL_USDC);
      setPulls((p) => p + 1);
      if (data.win) {
        setWins((w) => w + 1);
        if (data.multiplier > biggestMultiplier) setBiggestMultiplier(data.multiplier);
      }

      setTimeout(() => {
        setReels((prev) => [data.reels[0], prev[1], prev[2]]);
        setSpinningReels([false, true, true]);
      }, 500);
      setTimeout(() => {
        setReels((prev) => [data.reels[0], data.reels[1], prev[2]]);
        setSpinningReels([false, false, true]);
      }, 900);
      setTimeout(() => {
        setReels(data.reels);
        setSpinningReels([false, false, false]);
        setLastResult(data);
        setIsPulling(false);
      }, 1300);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSpinningReels([false, false, false]);
      setReels(PLACEHOLDER_REELS);
      setIsPulling(false);
    }
  }

  function handleReset() {
    setSession(null);
    setSpent(0);
    setPulls(0);
    setWins(0);
    setBiggestMultiplier(0);
    setReels(PLACEHOLDER_REELS);
    setLastResult(null);
    setErrorMsg(null);
    if (typeof localStorage !== "undefined") localStorage.removeItem(LS_KEY);
  }

  useEffect(() => {
    if (!walletAddress) return;
    const stored = loadStored(walletAddress);
    if (!stored) return;
    (async () => {
      try {
        const r = await fetch(`${stored.facilitatorUrl}/sessions/${stored.sessionId}`);
        if (!r.ok) {
          localStorage.removeItem(LS_KEY);
          return;
        }
        const row = await r.json();
        const handle: SessionHandle = {
          ...stored,
          fetch: wrapFetch(stored.sessionId, stored.facilitatorUrl),
        };
        setSession(handle);
        const spentBaseUnits = BigInt(row.spent ?? "0");
        setSpent(baseUnitsToUsdc(spentBaseUnits));
      } catch {
        // ignore
      }
    })();
  }, [walletAddress]);

  const winRate = pulls > 0 ? ((wins / pulls) * 100).toFixed(0) : "0";
  const sessionExhausted = !!session && remaining < PER_PULL_USDC;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#2463EB]/20 flex items-center justify-center text-[#60A5FA]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {walletAddress ? "Payment Session" : "Connect Wallet"}
              </h3>
              <p className="text-sm text-white/50">
                {walletAddress
                  ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
                  : "Sign one approve tx, pay per lever pull"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!walletAddress ? (
              <WalletButton />
            ) : (
              <>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  {(["1", "2", "manual"] as const).map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAuthAmount(amount)}
                      disabled={!!session}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50
                        ${
                          authAmount === amount
                            ? "bg-white text-black shadow-lg"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      {amount === "manual" ? "Manual" : `$${amount}`}
                    </button>
                  ))}
                </div>

                {authAmount === "manual" && (
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    disabled={!!session}
                    className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2463EB]/40 disabled:opacity-50"
                    placeholder="5.00"
                  />
                )}

                <button
                  onClick={handleAuthorize}
                  disabled={isAuthorizing || !!session}
                  className="rounded-xl px-6 py-2 bg-[#2463EB] hover:bg-[#1d4ed8] text-white font-medium shadow-lg shadow-[#2463EB]/30 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-colors"
                >
                  {isAuthorizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing…
                    </>
                  ) : session ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Authorized
                    </>
                  ) : (
                    `Authorize $${cap || 0}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {session && (
          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Authorized" value={`$${displayedCap.toFixed(2)}`} />
            <Stat label="Spent" value={`$${spent.toFixed(2)}`} accent />
            <Stat label="Remaining" value={`$${remaining.toFixed(2)}`} />
            <Stat
              label="Pulls left"
              value={Math.floor(remaining / PER_PULL_USDC).toString()}
            />
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="break-all">{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl">
        <div className="flex justify-center gap-3 sm:gap-6 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-24 h-28 sm:w-32 sm:h-36 rounded-2xl bg-black/60 border-2 border-white/10 flex items-center justify-center overflow-hidden relative shadow-inner"
            >
              <AnimatePresence mode="wait">
                {spinningReels[i] ? (
                  <motion.div
                    key="spin"
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 0.15, repeat: Infinity }}
                    className="text-5xl sm:text-6xl"
                  >
                    🎰
                  </motion.div>
                ) : (
                  <motion.div
                    key={reels[i] + i}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="text-5xl sm:text-6xl"
                  >
                    {reels[i]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handlePull}
            disabled={!canPull}
            className="rounded-xl px-10 py-4 text-lg font-bold bg-[#2463EB] hover:bg-[#1d4ed8] text-white shadow-lg shadow-[#2463EB]/40 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-colors"
          >
            {isPulling ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Spinning…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Pull Lever · ${PER_PULL_USDC.toFixed(2)}
              </>
            )}
          </button>

          {lastResult && !isPulling && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center text-sm font-semibold mt-2 px-4 py-2 rounded-lg ${
                lastResult.win
                  ? "text-green-400 bg-green-500/10 border border-green-500/30"
                  : "text-white/40"
              }`}
            >
              {lastResult.payoutLabel}
            </motion.div>
          )}

          {!session && walletAddress && (
            <p className="text-xs text-white/30 text-center mt-2">
              Authorize a session to start pulling
            </p>
          )}
          {!walletAddress && (
            <p className="text-xs text-white/30 text-center mt-2">
              Connect your wallet to start pulling
            </p>
          )}
          {sessionExhausted && (
            <div className="mt-3 w-full max-w-md flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#2463EB]/10 border border-[#2463EB]/30">
              <span className="text-xs sm:text-sm text-white/70">
                Session cap reached — open a new one to keep pulling.
              </span>
              <button
                onClick={handleReset}
                className="rounded-lg px-4 py-1.5 text-sm font-medium bg-[#2463EB] hover:bg-[#1d4ed8] text-white shadow shadow-[#2463EB]/30 transition-colors"
              >
                Start new session
              </button>
            </div>
          )}
        </div>
      </div>

      {pulls > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Coins className="h-4 w-4" />}
            label="Pulls"
            value={pulls.toString()}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Wins"
            value={`${wins} (${winRate}%)`}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Best"
            value={biggestMultiplier > 0 ? `×${biggestMultiplier}` : "—"}
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <span className="text-[10px] uppercase tracking-wider text-white/25 block mb-1">
        {label}
      </span>
      <span
        className={`text-lg font-mono ${accent ? "text-[#60A5FA]" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-[#2463EB]/20 text-[#60A5FA] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-white/30">
          {label}
        </div>
        <div className="text-sm font-mono text-white">{value}</div>
      </div>
    </div>
  );
}
