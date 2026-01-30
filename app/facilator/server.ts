import { config } from "dotenv";
import express, { Request, Response } from "express";
import {
    type PaymentRequirements,
    type PaymentPayload,
    type SettleRequest,
    type SettleResponse,
    type Network,
    type VerifyRequest,
    type VerifyResponse
} from "@x402/core/types";
import { SOLANA_DEVNET_CAIP2 } from "@x402/svm";
import path from "path";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const KORA_RPC_URL = process.env.KORA_RPC_URL || "http://localhost:8080/";
const FACILITATOR_PORT = process.env.FACILITATOR_PORT || 3001;
const NETWORK = (process.env.NETWORK || SOLANA_DEVNET_CAIP2) as Network;
const KORA_API_KEY = process.env.KORA_API_KEY || "kora_facilitator_api_key_example";

/** Lazy-load Kora client so facilitator can start even when SDK isn't built. */
async function getKoraClient() {
    const { KoraClient } = await import("@solana/kora");
    return new KoraClient({ rpcUrl: KORA_RPC_URL, apiKey: KORA_API_KEY });
}

/** Get transaction signature (tx id, base58) from serialized signed transaction base64. */
function getTxSignatureFromSerialized(base64: string): string {
    const bs58 = require("bs58") as { encode: (data: Uint8Array | Buffer) => string };
    const buf = Buffer.from(base64, "base64");
    if (buf.length < 65) return base64;

    try {
        // Prefer @solana/web3.js deserialize so we get the correct first signature (tx id)
        const { VersionedTransaction } = require("@solana/web3.js");
        const tx = VersionedTransaction.deserialize(new Uint8Array(buf));
        const sig = tx.signatures[0];
        if (sig && sig.length === 64) {
            return bs58.encode(sig);
        }
    } catch {
        // Fallback: wire format is [compact-u16 numSignatures][64 bytes per signature]...
        // For 1 or 2 signers, compact-u16 is one byte (0x01 or 0x02), so first sig at bytes 1–64
        if (buf.length >= 1 + 64) {
            return bs58.encode(buf.subarray(1, 1 + 64));
        }
    }
    return base64;
}

const app = express();

// CORS: allow browser on localhost:3000 to call facilitator on :3001
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin === "http://localhost:3000" || origin.startsWith("http://127.0.0.1:"))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "facilitator" });
});

// Test payment endpoint (for testing purposes)
app.post("/test-payment", async (req: Request, res: Response) => {
    console.log("=== /test-payment endpoint called ===");
    res.json({
        success: true,
        message: "Test payment received",
        data: req.body,
        timestamp: new Date().toISOString()
    });
});

// GET/POST getAmount - Return ciphertext for a given amount (for x402 confidential payments)
app.get("/getAmount", (req: Request, res: Response) => {
    res.json({
        endpoint: "/getAmount",
        description: "GET or POST to get ciphertext for a payment amount",
        query: "amount=1&decimals=9",
        body: { amount: "number (e.g. 1)", decimals: "number (default 9)" },
    });
});
app.post("/getAmount", async (req: Request, res: Response) => {
    console.log("=== /getAmount endpoint called ===");
    try {
        const amount = Number(req.body?.amount ?? req.query?.amount ?? 1);
        const decimals = Number(req.body?.decimals ?? req.query?.decimals ?? 9);
        if (isNaN(amount) || amount <= 0) {
            res.status(400).json({ error: "Invalid amount" });
            return;
        }
        const { encryptValue } = await import("@inco/solana-sdk/encryption");
        const amountRaw = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        const ciphertext = await encryptValue(amountRaw);
        res.json({ ciphertext, amount, decimals });
    } catch (error: any) {
        console.error("✗ getAmount failed:", error);
        res.status(500).json({ error: error?.message ?? "Failed to encrypt amount" });
    }
});

// GET /verify - Documentation endpoint
app.get("/verify", (req: Request, res: Response) => {
    res.json({
        endpoint: "/verify",
        description: "POST to verify x402 payments",
        body: {
            paymentPayload: "PaymentPayload",
            paymentRequirements: "PaymentRequirements",
        },
    });
});

// POST /verify - Verify payment (transaction or signature-based with encrypted amount)
app.post("/verify", async (req: Request, res: Response) => {
    console.log("=== /verify endpoint called ===");

    try {
        const { paymentPayload, paymentRequirements } = req.body as {
            paymentPayload: PaymentPayload;
            paymentRequirements: PaymentRequirements;
        };

        if (!paymentRequirements?.network?.startsWith("solana:")) {
            throw new Error("Invalid network - only Solana networks are supported");
        }

        const payload = paymentPayload?.payload as Record<string, unknown>;

        // Signature-based x402 flow: verify message signed by payer (encrypted amount authorization)
        if (payload?.signature != null && payload?.message != null && payload?.payer != null) {
            const signature = payload.signature as string;
            const message = payload.message as string;
            const payer = payload.payer as string;
            const ciphertext = payload.ciphertext as string | undefined;
            const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : new Uint8Array(Buffer.from(message, "base64"));
            let sigBuf: Buffer = Buffer.isBuffer(signature) ? signature : Buffer.from(signature, signature.length === 128 ? "hex" : "base64");
            if (sigBuf.length > 64) sigBuf = sigBuf.subarray(0, 64);
            const signatureBytes = new Uint8Array(sigBuf);
            const payerPubkey = new PublicKey(payer);
            const valid = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                new Uint8Array(payerPubkey.toBytes())
            );
            if (!valid) {
                res.status(400).json({ isValid: false, invalidReason: "Invalid signature" });
                return;
            }
            if (ciphertext != null && typeof message === "string" && !message.includes(ciphertext.substring(0, 32))) {
                res.status(400).json({ isValid: false, invalidReason: "Message does not match ciphertext" });
                return;
            }
            console.log("✓ Signature-based payment verified successfully");
            res.json({ isValid: true });
            return;
        }

        // Transaction-based flow: use Kora to verify transaction
        const transaction = payload?.transaction as string;
        if (!transaction) {
            res.status(400).json({ isValid: false, invalidReason: "Missing transaction or signature payload" });
            return;
        }

        let kora;
        try {
            kora = await getKoraClient();
        } catch (e: any) {
            if (e?.code === "MODULE_NOT_FOUND" || e?.message?.includes("Cannot find module")) {
                res.status(503).json({ error: "Kora SDK not built. Run: yarn kora:build-sdk" });
                return;
            }
            throw e;
        }

        const { signed_transaction } = await kora.signTransaction({ transaction });
        console.log("✓ Payment verified successfully");
        res.json({ isValid: true });
    } catch (error) {
        console.error("✗ Payment verification failed:", error);
        res.status(400).json({
            isValid: false,
            invalidReason: error instanceof Error ? error.message : "Kora validation failed",
        });
    }
});

// GET /settle - Documentation endpoint
app.get("/settle", (req: Request, res: Response) => {
    res.json({
        endpoint: "/settle",
        description: "POST to settle x402 payments",
        body: {
            paymentPayload: "PaymentPayload",
            paymentRequirements: "PaymentRequirements",
        },
    });
});

// POST /settle - Settle payment by broadcasting to blockchain
app.post("/settle", async (req: Request, res: Response) => {
    console.log("=== /settle endpoint called ===");
    try {
        const body: SettleRequest = req.body;
        const { paymentPayload, paymentRequirements } = req.body as {
            paymentPayload: PaymentPayload;
            paymentRequirements: PaymentRequirements;
        };

        if(!paymentRequirements.network.startsWith("solana:")) {
            throw new Error("Invalid network - only Solana networks are supported");
        }

        const { transaction } = paymentPayload.payload as { transaction: string };

        let kora;
        try {
            kora = await getKoraClient();
        } catch (e: any) {
            if (e?.code === "MODULE_NOT_FOUND" || e?.message?.includes("Cannot find module")) {
                res.status(503).json({ transaction: "", success: false, network: NETWORK, errorReason: "Kora SDK not built. Run: yarn kora:build-sdk" });
                return;
            }
            throw e;
        }

        // Use Kora to sign and send transaction (broadcast to Solana)
        const result = await kora.signAndSendTransaction({
            transaction
        });

        const txSignature = getTxSignatureFromSerialized(result.signed_transaction);
        const response: SettleResponse = {
            transaction: txSignature,
            success: true,
            network: NETWORK,
        }

        console.log(`✓ Payment settled successfully: ${txSignature}`);
        res.json(response);
    } catch (error) {
        console.error("✗ Payment settlement failed:", error);
        const response: SettleResponse = {
            transaction: "",
            success: false,
            network: NETWORK,
            errorReason: error instanceof Error ? error.message : "Kora validation failed",
        };
        res.status(400).json(response);
    }
});

// GET /supported - Advertise facilitator capabilities
app.get("/supported", async (req: Request, res: Response) => {
    console.log("=== /supported endpoint called ===");
    const sdkMissing = (e: any) =>
        e?.code === "MODULE_NOT_FOUND" ||
        e?.code === "ERR_MODULE_NOT_FOUND" ||
        (typeof e?.message === "string" && (e.message.includes("Cannot find module") || e.message.includes("Cannot find package")));
    try {
        const kora = await getKoraClient();

        // Get the fee payer address from Kora
        const { signer_address } = await kora.getPayerSigner();

        const kinds = [{
            x402Version: 2,
            scheme: "exact",
            network: NETWORK,
            extra: {
                feePayer: signer_address,
            },
        }];

        res.json({ kinds });
    } catch (error: any) {
        if (sdkMissing(error)) {
            console.warn("Kora SDK not built – returning fallback. Run: yarn kora:build-sdk");
            res.status(200).json({
                kinds: [{
                    x402Version: 2,
                    scheme: "exact",
                    network: NETWORK,
                    extra: { feePayer: "(run yarn kora:build-sdk for real fee payer)", _sdkNotBuilt: true },
                }],
            });
            return;
        }
        console.error("✗ Failed to get supported payment kinds:", error);
        res.status(500).json({
            error: `Failed to get supported payment kinds: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

// Start server
if (require.main === module) {
    app.listen(FACILITATOR_PORT, () => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`FACILITATOR SERVER STARTED`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Server listening at http://localhost:${FACILITATOR_PORT}`);
        console.log(`Kora RPC URL: ${KORA_RPC_URL}`);
        console.log(`Network: ${NETWORK}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    });
}

export default app;
