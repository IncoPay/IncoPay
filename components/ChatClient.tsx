"use client";

import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import WalletButton from "../app/components/WalletButton";
import {
  createSession,
  wrapFetch,
  type SessionHandle,
  type ClientSvmSigner,
  type Network,
} from "solana-x402-sessions";

// Hardcoded demo config — no .env.local needed.
const FACILITATOR_URL = "https://inco-facilitator-production.up.railway.app";
const RPC_URL = "https://api.devnet.solana.com";
const MINT = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
const RECIPIENT = "55LEmvuVgujxEvbrYBiDXBZmMxu3dMofVvT6uCq4q2xK";
const NETWORK: Network = "solana:devnet";
const PER_CALL_BASE_UNITS = 500_000n; // 0.5 USDC @ 6 decimals

interface Msg {
  role: "user" | "bot" | "err";
  text: string;
  txLink?: string;
}

const LS_KEY = "inco-x402-session:v1";
const DECIMALS = 6; // Token decimals

// Format base units to human-readable USDC
function formatUSDC(baseUnits: string | bigint): string {
  const bi = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
  const whole = bi / BigInt(10 ** DECIMALS);
  const frac = bi % BigInt(10 ** DECIMALS);
  const fracStr = frac.toString().padStart(DECIMALS, "0");
  return `${whole}.${fracStr}`.replace(/\.?0+$/, "");
}

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

function ChatInner() {
  const { publicKey, signMessage, signTransaction } = useWallet();
  const userPubkey = publicKey?.toBase58() || null;

  const [session, setSession] = useState<SessionHandle | null>(null);
  const [authAmount, setAuthAmount] = useState<"1" | "2" | "manual">("1");
  const [manualAmount, setManualAmount] = useState("5");
  const cap = authAmount === "manual" ? (manualAmount || "0") : authAmount;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{
    spent?: string;
    remaining?: string;
    lastTx?: string;
  }>({});

  const [balanceHandle, setBalanceHandle] = useState<string | null>(null);
  const [balanceAccountExists, setBalanceAccountExists] = useState<boolean>(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintTx, setMintTx] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [balanceErr, setBalanceErr] = useState<string | null>(null);
  // Once the user has revealed once, auto-decrypt on subsequent refreshes
  // so balance updates "live" after each mint without a fresh signature
  // for already-shown handles.
  const [autoReveal, setAutoReveal] = useState(false);

  async function refreshBalance() {
    if (!userPubkey) return;
    setBalanceErr(null);
    try {
      const r = await fetch(`/api/balance?user=${userPubkey}`);
      const j = await r.json();
      if (!r.ok) {
        setBalanceErr(j.error || "balance read failed");
        return;
      }
      setBalanceAccountExists(!!j.exists);
      const newHandle = j.handleHex ?? null;
      const handleChanged = newHandle && newHandle !== balanceHandle;
      setBalanceHandle(newHandle);
      if (handleChanged) setDecrypted(null);
    } catch (e) {
      setBalanceErr((e as Error).message);
    }
  }

  // Whenever the handle changes and the user has previously revealed, kick off
  // a fresh decrypt automatically (will prompt for one Phantom sign per new
  // handle — that's an Inco protocol requirement, not a UX choice).
  useEffect(() => {
    if (autoReveal && balanceHandle && decrypted === null && !decrypting) {
      onDecryptBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceHandle, autoReveal]);

  useEffect(() => {
    if (userPubkey) refreshBalance();
  }, [userPubkey]);

  async function onMint() {
    if (!userPubkey) return;
    setMinting(true);
    setBalanceErr(null);
    setMintTx(null);
    try {
      const r = await fetch(`/api/mint-usdc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user: userPubkey, amount: 100 }),
      });
       const j = await r.json();
       if (!r.ok) throw new Error(j.error || "mint failed");
       setMintTx(j.sig);
       setMsgs((m) => [
         ...m,
         { role: "bot", text: `Minted 100 USDC (encrypted) to your IncoAccount.`, txLink: j.sig },
       ]);
      await new Promise((r) => setTimeout(r, 1200));
      await refreshBalance();
    } catch (e) {
      setBalanceErr((e as Error).message);
    } finally {
      setMinting(false);
    }
  }

   async function onDecryptBalance() {
     if (!publicKey || !signMessage || !balanceHandle) return;
     setDecrypting(true);
     setBalanceErr(null);
     try {
       const { decrypt } = (await import("@inco/solana-sdk/attested-decrypt")) as any;
       // Covalidator's index keys handles by DECIMAL u128 string. Hex (with or
       // without 0x) is rejected. Convert here.
       const decimalHandle = BigInt(`0x${balanceHandle.replace(/^0x/, "")}`).toString();
       const result = await decrypt([decimalHandle], {
         address: publicKey,
         signMessage: async (msg: Uint8Array) => {
           // Format the message display to show hex instead of scientific notation
           console.log(`[decrypt] signing message with handle: 0x${balanceHandle.slice(0, 16)}…`);
           return signMessage(msg);
         },
       });
       const plain = BigInt(result.plaintexts[0]);
       const ui = (Number(plain) / 1_000_000).toFixed(2);
       setDecrypted(ui);
       setAutoReveal(true);
     } catch (e) {
       const err = e as any;
       console.error("[decrypt] full error:", err);
       const causeMsg = err?.cause?.message || err?.cause?.toString?.() || "";
       const composed = causeMsg ? `${err?.message} — cause: ${causeMsg}` : err?.message;
       setBalanceErr(`decrypt failed: ${composed}`);
     } finally {
       setDecrypting(false);
     }
   }

  useEffect(() => {
    if (!userPubkey) return;
    const stored = loadStored(userPubkey);
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
         setStats({ spent: row.spent, remaining: (BigInt(row.cap) - BigInt(row.spent)).toString() });
         setMsgs((m) => [
           ...m,
           { role: "bot", text: `Resumed session ${stored.sessionId.slice(0, 8)}… (spent ${formatUSDC(row.spent)}/${formatUSDC(row.cap)} USDC)` },
         ]);
      } catch {
        // ignore
      }
    })();
  }, [userPubkey]);

  const canCreateSession =
    !!publicKey && !!signMessage && !!signTransaction && !!MINT && !!RECIPIENT;

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

  async function onCreateSession() {
    if (!createSvmSigner) return;
    setBusy(true);
    try {
      // Convert cap from USDC to base units (6 decimals)
      const capBaseUnits = (BigInt(Math.floor(Number(cap) * 10 ** DECIMALS))).toString();
      const s = await createSession({
        facilitatorUrl: FACILITATOR_URL,
        network: NETWORK,
        asset: MINT,
        recipient: RECIPIENT,
        cap: capBaseUnits,
        expirationSeconds: 3600,
        signer: createSvmSigner,
        solanaRpcUrl: RPC_URL,
      });
      setSession(s);
      storeSession(s);
      setMsgs((m) => [
        ...m,
        { role: "bot", text: `Session opened: ${s.sessionId.slice(0, 8)}… (cap: ${formatUSDC(s.cap)} USDC)` },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: "err", text: `create-session failed: ${(e as Error).message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onSend() {
    if (!session || !input) return;
    const prompt = input;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: prompt }]);
    setBusy(true);
    try {
      const r = await session.fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!r.ok) {
        const body = await r.text();
        const looksLikeCap = body.includes("cap_exceeded") || body.includes("insufficient");
        setMsgs((m) => [
          ...m,
          {
            role: "err",
            text: looksLikeCap
              ? "Session cap reached. Start a new session to keep chatting."
              : `${r.status}: ${body.slice(0, 200)}`,
          },
        ]);
        return;
      }
      const j = await r.json();
      setMsgs((m) => [...m, { role: "bot", text: j.reply }]);
      setStats({ spent: j.spent, remaining: j.remaining, lastTx: j.paymentTx });
    } catch (e) {
      setMsgs((m) => [...m, { role: "err", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  function onResetSession() {
    localStorage.removeItem(LS_KEY);
    setSession(null);
    setStats({});
    setMsgs((m) => [
      ...m,
      { role: "bot", text: "Session closed. Open a new one with a fresh cap." },
    ]);
  }

  const sessionExhausted =
    !!session && !!stats.remaining && BigInt(stats.remaining) < PER_CALL_BASE_UNITS;

  return (
    <div className="sessions-demo">
      <style>{`
        .sessions-demo .cap-toggle {
          display: inline-flex;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 4px;
          gap: 2px;
        }
        .sessions-demo .cap-toggle-btn {
          background: transparent;
          color: rgba(255,255,255,0.6);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }
        .sessions-demo .cap-toggle-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .sessions-demo .cap-toggle-btn.is-active {
          background: #fff;
          color: #000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `}</style>
      <h1>Private AI Chat</h1>
      <h2>Each message settles 0.5 USDC confidentially via Inco Lightning · no gas, no extra prompts</h2>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="label">Wallet</div>
            <div className="value">
              {userPubkey || "not connected"}
            </div>
          </div>
          <WalletButton />
        </div>
      </div>

      {userPubkey && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="label">Private USDC balance (encrypted on-chain)</div>
               <div className="value" style={{ marginTop: 4 }}>
                 {!balanceAccountExists
                   ? "no IncoAccount yet — mint to create one"
                   : decrypted !== null
                     ? `$${decrypted} USDC (decrypted in-browser)`
                     : balanceHandle
                       ? `🔒 handle ${balanceHandle.slice(0, 10)}… (sign to decrypt)`
                       : "loading…"}
               </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button onClick={onMint} disabled={minting} style={{ background: "#2463EB" }}>
                {minting ? "Minting…" : "Mint 100 USDC (devnet)"}
              </button>
              <button
                onClick={onDecryptBalance}
                disabled={!balanceHandle || decrypting || !signMessage}
                style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
              >
                {decrypting ? "Signing…" : "Reveal"}
              </button>
              <button
                onClick={refreshBalance}
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}
              >
                ↻
              </button>
            </div>
          </div>
          {mintTx && (
            <div className="stat" style={{ marginTop: 12 }}>
              <span>last mint</span>
              <a
                className="value"
                target="_blank"
                rel="noreferrer"
                href={`https://explorer.solana.com/tx/${mintTx}?cluster=devnet`}
              >
                {mintTx.slice(0, 16)}…
              </a>
            </div>
          )}
          {balanceErr && !/keypair not found|TOKEN_MINT/i.test(balanceErr) && (
            <p style={{ marginTop: 10, color: "#f87171", fontSize: 13 }}>{balanceErr}</p>
          )}
        </div>
      )}

      {!session ? (
        <div className="card">
          <div className="label">Authorize spending cap</div>
          <div className="row" style={{ marginTop: 10, gap: 12, flexWrap: "wrap" }}>
            <div className="cap-toggle">
              {(["1", "2", "manual"] as const).map((amount) => (
                <button
                  key={amount}
                  onClick={() => setAuthAmount(amount)}
                  className={`cap-toggle-btn ${authAmount === amount ? "is-active" : ""}`}
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
                placeholder="cap (USDC)"
                style={{ maxWidth: 120 }}
              />
            )}
            <button
              disabled={!canCreateSession || busy || !cap || Number(cap) <= 0}
              onClick={onCreateSession}
            >
              {busy ? "Signing…" : `Authorize $${cap || "0"}`}
            </button>
          </div>
          {!MINT && (
            <p style={{ marginTop: 10, color: "#f87171", fontSize: 13 }}>
              NEXT_PUBLIC_TOKEN_MINT not set in <code>IncoPay/.env.local</code>.
            </p>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="label" style={{ marginBottom: 0 }}>Session</div>
            <button
              onClick={onResetSession}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 6,
              }}
            >
              End session
            </button>
          </div>
           <div className="stat"><span>id</span><span className="value">{session.sessionId}</span></div>
           <div className="stat"><span>cap</span><span className="value">{formatUSDC(session.cap)} USDC</span></div>
           <div className="stat"><span>spent</span><span className="value">{formatUSDC(stats.spent ?? "0")} USDC</span></div>
           <div className="stat"><span>remaining</span><span className="value">{formatUSDC(stats.remaining ?? session.cap)} USDC</span></div>
          {stats.lastTx && (
            <div className="stat">
              <span>last tx</span>
              <a
                className="value"
                target="_blank"
                rel="noreferrer"
                href={`https://explorer.solana.com/tx/${stats.lastTx}?cluster=devnet`}
              >
                {stats.lastTx.slice(0, 16)}…
              </a>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ minHeight: 260 }}>
        <div className="chat">
           {msgs.length === 0 && (
             <div style={{ color: "#7c7c8a", fontSize: 14 }}>No messages yet.</div>
           )}
           {msgs.map((m, i) => (
             <div key={i} className={`msg ${m.role}`}>
               {m.txLink ? (
                 <>
                   {m.text}{" "}
                   <a
                     href={`https://explorer.solana.com/tx/${m.txLink}?cluster=devnet`}
                     target="_blank"
                     rel="noreferrer"
                     style={{ color: "#60A5FA", textDecoration: "underline", cursor: "pointer" }}
                   >
                     {m.txLink.slice(0, 16)}…
                   </a>
                 </>
               ) : (
                 m.text
               )}
             </div>
           ))}
         </div>
        {sessionExhausted && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              background: "rgba(36, 99, 235, 0.08)",
              border: "1px solid rgba(36, 99, 235, 0.3)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, color: "#cbd5e1" }}>
              Session cap reached — open a new one to keep chatting.
            </span>
            <button onClick={onResetSession} style={{ background: "#2463EB" }}>
              Start new session
            </button>
          </div>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <input
            type="text"
            placeholder={
              sessionExhausted
                ? "Cap reached — start a new session"
                : session
                  ? "Say something…"
                  : "Open a session first"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sessionExhausted) onSend();
            }}
            disabled={!session || busy || sessionExhausted}
          />
          <button disabled={!session || busy || !input || sessionExhausted} onClick={onSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatClient() {
  return <ChatInner />;
}
