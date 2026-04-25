import { NextRequest, NextResponse } from "next/server";

const FACILITATOR_URL =
  process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:4021";
const RECIPIENT = process.env.NEXT_PUBLIC_RECIPIENT_PUBKEY || "";
const MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || "";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "solana:devnet";
const PER_PULL_BASE_UNITS = "100000"; // 0.10 USDC @ 6 decimals

const REEL: { symbol: string; weight: number; multiplier: number }[] = [
  { symbol: "🍋", weight: 25, multiplier: 1 },
  { symbol: "🍒", weight: 20, multiplier: 2 },
  { symbol: "🍊", weight: 18, multiplier: 3 },
  { symbol: "🍇", weight: 15, multiplier: 5 },
  { symbol: "🔔", weight: 10, multiplier: 10 },
  { symbol: "⭐", weight: 7, multiplier: 25 },
  { symbol: "💎", weight: 4, multiplier: 100 },
  { symbol: "7️⃣", weight: 1, multiplier: 777 },
];

function spinReel(): { symbol: string; multiplier: number } {
  const total = REEL.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of REEL) {
    roll -= r.weight;
    if (roll <= 0) return { symbol: r.symbol, multiplier: r.multiplier };
  }
  return REEL[0];
}

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
        amount: PER_PULL_BASE_UNITS,
        payTo: RECIPIENT,
        maxTimeoutSeconds: 60,
        extra: { facilitatorUrl: FACILITATOR_URL, per: "pull" },
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

  const a = spinReel();
  const b = spinReel();
  const c = spinReel();
  const allSame = a.symbol === b.symbol && b.symbol === c.symbol;
  const twoSame =
    !allSame &&
    (a.symbol === b.symbol ||
      b.symbol === c.symbol ||
      a.symbol === c.symbol);

  let multiplier = 0;
  let payoutLabel: string;
  if (allSame) {
    multiplier = a.multiplier;
    payoutLabel = `JACKPOT ${a.symbol}${a.symbol}${a.symbol} ×${multiplier}`;
  } else if (twoSame) {
    multiplier = 0;
    payoutLabel = "So close! 2 of a kind (no payout)";
  } else {
    payoutLabel = "No win — try again";
  }

  return NextResponse.json({
    reels: [a.symbol, b.symbol, c.symbol],
    win: allSame,
    multiplier,
    payoutLabel,
    seed: Math.random().toString(36).slice(2, 10),
    paymentTx: settle.transaction,
    remaining: settle.extensions?.session?.remaining,
    spent: settle.extensions?.session?.spent,
  });
}
