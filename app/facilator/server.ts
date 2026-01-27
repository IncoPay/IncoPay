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

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const KORA_RPC_URL = process.env.KORA_RPC_URL || "http://localhost:8080/";
const FACILITATOR_PORT = process.env.FACILITATOR_PORT || 3000;
const NETWORK = (process.env.NETWORK || SOLANA_DEVNET_CAIP2) as Network;
const KORA_API_KEY = process.env.KORA_API_KEY || "kora_facilitator_api_key_example";

/** Lazy-load Kora client so facilitator can start even when SDK isn't built. */
async function getKoraClient() {
    // @ts-expect-error - optional: run yarn kora:build-sdk for /supported, /verify, /settle
    const { KoraClient } = await import("@solana/kora");
    return new KoraClient({ rpcUrl: KORA_RPC_URL, apiKey: KORA_API_KEY });
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

// POST /verify - Verify payment without broadcasting
app.post("/verify", async (req: Request, res: Response) => {
    console.log("=== /verify endpoint called ===");

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

    try {
        const body: VerifyRequest = req.body;
        const { paymentPayload, paymentRequirements } = req.body as {
            paymentPayload: PaymentPayload;
            paymentRequirements: PaymentRequirements;
        };

        if(!paymentRequirements.network.startsWith("solana:")) {
            throw new Error("Invalid network - only Solana networks are supported");
        }

        const { transaction } = paymentPayload.payload as { transaction: string };
        
        // Use Kora to sign transaction (verification without broadcasting)
        const { signed_transaction } = await kora.signTransaction({
            transaction
        });

        const verifyResponse: VerifyResponse = {
            isValid: true,
        };

        console.log("✓ Payment verified successfully");
        res.json(verifyResponse);
    } catch (error) {
        console.error("✗ Payment verification failed:", error);
        const verifyResponse: VerifyResponse = {
            isValid: false,
            invalidReason: error instanceof Error ? error.message : "Kora validation failed",
        };
        res.status(400).json(verifyResponse);
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
        const { signature } = await kora.signAndSendTransaction({
            transaction
        });

        const response: SettleResponse = {
            transaction: signature,
            success: true,
            network: NETWORK,
        }

        console.log(`✓ Payment settled successfully: ${signature}`);
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
