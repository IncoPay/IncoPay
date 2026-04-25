/**
 * 402-gated chat endpoint for the x402-sessions private demo.
 *
 * Flow:
 *   1. client POSTs { prompt }
 *   2. if no PAYMENT-SIGNATURE header → return 402 with PAYMENT-REQUIRED
 *   3. if header present → forward to facilitator /settle; on success, call Ollama
 */
import { NextRequest, NextResponse } from "next/server";

const FACILITATOR_URL = "https://inco-facilitator-production.up.railway.app";
const RECIPIENT = "55LEmvuVgujxEvbrYBiDXBZmMxu3dMofVvT6uCq4q2xK";
const MINT = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
const NETWORK = "solana:devnet";
const PER_CALL_BASE_UNITS = "500000"; // 0.5 USDC (@ 6 decimals)
const AI_URL = "https://0ziii4vt975sjd-8000.proxy.runpod.net/v1/chat/completions";
const AI_MODEL = "Qwen/Qwen3-VL-8B-Instruct";

function b64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}
function b64dec(s: string): string {
  return Buffer.from(s, "base64").toString("utf8");
}

function paymentRequired(url: string) {
  const pr = {
    x402Version: 2,
    error: "payment_required",
    resource: { url },
    accepts: [
      {
        scheme: "session",
        network: NETWORK,
        asset: MINT,
        amount: PER_CALL_BASE_UNITS,
        payTo: RECIPIENT,
        maxTimeoutSeconds: 60,
        extra: { facilitatorUrl: FACILITATOR_URL, per: "message" },
      },
    ],
  };
  return new NextResponse(JSON.stringify(pr), {
    status: 402,
    headers: {
      "content-type": "application/json",
      "PAYMENT-REQUIRED": b64(JSON.stringify(pr)),
    },
  });
}

export async function POST(req: NextRequest) {
  if (!RECIPIENT || !MINT) {
    return NextResponse.json(
      {
        error:
          "server not configured: set NEXT_PUBLIC_RECIPIENT_PUBKEY and NEXT_PUBLIC_TOKEN_MINT",
      },
      { status: 500 }
    );
  }

  const paymentHeader =
    req.headers.get("PAYMENT-SIGNATURE") ||
    req.headers.get("X-PAYMENT") ||
    req.headers.get("payment-signature") ||
    req.headers.get("x-payment");

  if (!paymentHeader) return paymentRequired(req.url);

  let payload: any;
  try {
    payload = JSON.parse(b64dec(paymentHeader));
  } catch {
    return NextResponse.json({ error: "bad_payment_payload" }, { status: 400 });
  }

  const paymentRequirements = payload.accepted;
  if (!paymentRequirements) return paymentRequired(req.url);

  const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      paymentPayload: payload,
      paymentRequirements,
    }),
  });
  const settle = await settleRes.json();
  if (!settle.success) {
    return new NextResponse(
      JSON.stringify({ error: "settle_failed", details: settle }),
      {
        status: 402,
        headers: {
          "content-type": "application/json",
          "PAYMENT-RESPONSE": b64(JSON.stringify(settle)),
        },
      }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
  }

  let reply = "(AI unreachable, but payment settled ✓)";
  try {
    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
      }),
    });
    if (aiRes.ok) {
      const j = await aiRes.json();
      reply = j?.choices?.[0]?.message?.content || "(empty AI reply)";
    }
  } catch {
    // keep fallback
  }

  return NextResponse.json({
    reply,
    paymentTx: settle.transaction,
    remaining: settle.extensions?.session?.remaining,
    spent: settle.extensions?.session?.spent,
  });
}
