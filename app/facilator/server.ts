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
/** Solana RPC for building tx (getLatestBlockhash). Do not use Kora proxy here – it returns 405 for getLatestBlockhash. */
const SOLANA_RPC_URL = process.env.RPC_URL || process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const FACILITATOR_PORT = process.env.FACILITATOR_PORT || 3001;
const NETWORK = (process.env.NETWORK || SOLANA_DEVNET_CAIP2) as Network;
const KORA_API_KEY = process.env.KORA_API_KEY || "kora_facilitator_api_key_example";

const INCO_TOKEN_PROGRAM_ID = new PublicKey("9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi");
const INCO_LIGHTNING_PROGRAM_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");
const SYSVAR_INSTRUCTIONS_ID = new PublicKey("Sysvar1nstructions1111111111111111111111111");

function getIncoAssociatedTokenAddress(wallet: PublicKey, mint: PublicKey): PublicKey {
    const [addr] = PublicKey.findProgramAddressSync(
        [wallet.toBuffer(), INCO_TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        INCO_TOKEN_PROGRAM_ID
    );
    return addr;
}

function getAllowancePda(handle: bigint, allowedAddress: PublicKey): PublicKey {
    const buf = Buffer.alloc(16);
    let h = handle;
    for (let i = 0; i < 16; i++) {
        buf[i] = Number(h & BigInt(0xff));
        h = h >> BigInt(8);
    }
    const [pda] = PublicKey.findProgramAddressSync(
        [buf, allowedAddress.toBuffer()],
        INCO_LIGHTNING_PROGRAM_ID
    );
    return pda;
}

function hexToBuffer(hex: string): Buffer {
    const match = hex.match(/.{1,2}/g);
    if (!match) return Buffer.from([]);
    return Buffer.from(match.map((byte) => parseInt(byte, 16)));
}

/** Lazy-load Kora client so facilitator can start even when SDK isn't built. */
async function getKoraClient() {
    const { KoraClient } = await import("@solana/kora");
    return new KoraClient({ rpcUrl: KORA_RPC_URL, apiKey: KORA_API_KEY });
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Encode bytes to base58 (inline, no bs58 package). */
function toBase58(bytes: Uint8Array | Buffer): string {
    const b = bytes instanceof Buffer ? new Uint8Array(bytes) : bytes;
    let n = 0n;
    for (let i = 0; i < b.length; i++) n = n * 256n + BigInt(b[i]);
    if (n === 0n) return BASE58_ALPHABET[0];
    let out = "";
    while (n > 0n) {
        out = BASE58_ALPHABET[Number(n % 58n)] + out;
        n = n / 58n;
    }
    return out;
}

/** Extract a user-facing message from any thrown value in /settle. */
function normalizeSettleError(error: unknown): string {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    if (raw && (raw.includes("0xbc0") || raw.includes("custom program error"))) {
        return "Payment failed (program error). Sign the message first, then sign the transaction once when prompted so the facilitator can complete the payment on your behalf.";
    }
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    const o = error as Record<string, unknown> | null | undefined;
    if (!o) return "Settle failed.";
    if (typeof o.message === "string") return o.message;
    if (o.error && typeof (o.error as Record<string, unknown>).message === "string") {
        return String((o.error as Record<string, unknown>).message);
    }
    if (typeof o.errorReason === "string") return o.errorReason;
    const data = o.data as Record<string, unknown> | undefined;
    if (data && typeof data.err === "string") return data.err;
    try {
        const s = JSON.stringify(o);
        if (s && s !== "{}") return s;
    } catch (_) {}
    return "Settle failed.";
}

/** Get transaction signature (tx id, base58) from serialized signed transaction base64. */
function getTxSignatureFromSerialized(base64: string): string {
    try {
        const buf = Buffer.from(base64, "base64");
        if (buf.length < 65) return base64;
        const { VersionedTransaction } = require("@solana/web3.js");
        const tx = VersionedTransaction.deserialize(new Uint8Array(buf));
        const sig = tx.signatures[0];
        if (sig && sig.length === 64) {
            return toBase58(sig);
        }
        if (buf.length >= 1 + 64) {
            return toBase58(buf.subarray(1, 1 + 64));
        }
    } catch (_) {
        // fallback: return input so settle still returns something
    }
    return base64;
}

/** Build unsigned tx [Ed25519 verify, transfer_with_authorization] for Kora to sign and send. */
async function buildAuthTx(payload: {
    message: string;
    signature: string;
    payer: string;
    ciphertext: string;
    mint: string;
    paymentReceiver: string;
    sourceHandle: string;
    destHandle: string;
    feePayer: string;
}): Promise<string> {
    const { Connection, Transaction, Ed25519Program, SystemProgram } = await import("@solana/web3.js");
    const anchor = await import("@coral-xyz/anchor");
    const fs = await import("fs");

    const connection = new Connection(SOLANA_RPC_URL);
    const payer = new PublicKey(payload.payer);
    const mint = new PublicKey(payload.mint);
    const paymentReceiver = new PublicKey(payload.paymentReceiver);
    const feePayer = new PublicKey(payload.feePayer);

    const sourceAccount = getIncoAssociatedTokenAddress(payer, mint);
    const destAccount = getIncoAssociatedTokenAddress(paymentReceiver, mint);

    const sourceHandle = BigInt(payload.sourceHandle);
    const destHandle = BigInt(payload.destHandle);
    const sourceAllowancePda = getAllowancePda(sourceHandle, payer);
    const destAllowancePda = getAllowancePda(destHandle, paymentReceiver);

    const messageBytes = new TextEncoder().encode(payload.message);
    let sigBytes: Uint8Array;
    if (typeof payload.signature === "string") {
        const decoded = Buffer.from(payload.signature, "base64");
        sigBytes = new Uint8Array(decoded.length >= 64 ? decoded.subarray(0, 64) : decoded);
    } else {
        sigBytes = new Uint8Array((payload.signature as unknown as number[]).slice(0, 64));
    }
    if (sigBytes.length < 64) throw new Error("Invalid signature length");

    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
        publicKey: payer.toBytes(),
        message: messageBytes,
        signature: sigBytes,
    });

    const idlPath = path.join(process.cwd(), "public", "idl", "inco_token.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const programId = INCO_TOKEN_PROGRAM_ID;
    const provider = new anchor.AnchorProvider(
        connection,
        { publicKey: feePayer, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    const program = new anchor.Program(idl, provider);

    const ciphertextBuf = hexToBuffer(payload.ciphertext.startsWith("0x") ? payload.ciphertext.slice(2) : payload.ciphertext);

    const transferIx = await program.methods
        .transferWithAuthorization(ciphertextBuf, 0)
        .accounts({
            source: sourceAccount,
            destination: destAccount,
            payer,
            instructionsSysvar: SYSVAR_INSTRUCTIONS_ID,
            incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        } as any)
        .remainingAccounts([
            { pubkey: sourceAllowancePda, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: false, isWritable: false },
            { pubkey: destAllowancePda, isSigner: false, isWritable: true },
            { pubkey: paymentReceiver, isSigner: false, isWritable: false },
        ])
        .instruction();

    const tx = new Transaction();
    tx.add(ed25519Ix, transferIx);
    // Prefer Kora getBlockhash (avoids 403 from public devnet RPC); fallback to SOLANA_RPC_URL
    let blockhash: string;
    try {
        const kora = await getKoraClient();
        const res = await kora.getBlockhash();
        blockhash = res.blockhash;
    } catch (koraErr: any) {
        try {
            const latest = await connection.getLatestBlockhash();
            blockhash = latest.blockhash;
        } catch (rpcErr: any) {
            const msg = rpcErr?.message || String(rpcErr);
            if (msg.includes("403") || msg.includes("Forbidden")) {
                throw new Error(
                    "Blockhash unavailable: public RPC returned 403. Set RPC_URL or SOLANA_RPC_URL to a devnet RPC (e.g. Helius/QuickNode with API key), or ensure Kora is running with getBlockhash enabled."
                );
            }
            throw rpcErr;
        }
    }
    tx.recentBlockhash = blockhash;
    tx.feePayer = feePayer;

    const serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });
    return Buffer.from(serialized).toString("base64");
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

        // Signature-based x402 flow: Ed25519 verify message signed by payer (encrypted amount authorization)
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
            // Ed25519 signature verification (off-chain; no on-chain Ed25519 program call)
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
// Accepts either: (1) payload.transaction = base64 signed tx (legacy), or
// (2) payload.authorization = { message, signature, payer, ciphertext, mint, paymentReceiver, sourceHandle, destHandle } (new: facilitator builds tx)
app.post("/settle", async (req: Request, res: Response) => {
    console.log("=== /settle endpoint called ===");
    try {
        const { paymentPayload, paymentRequirements } = req.body as {
            paymentPayload: PaymentPayload;
            paymentRequirements: PaymentRequirements;
        };

        if (!paymentRequirements?.network?.startsWith("solana:")) {
            throw new Error("Invalid network - only Solana networks are supported");
        }

        const payload = paymentPayload?.payload as Record<string, unknown>;
        let transactionBase64: string;

        if (payload?.authorization != null) {
            // Two-step: build unsigned tx (payer must sign for inco-lightning CPI); return for client to sign, then client POSTs signed tx.
            const auth = payload.authorization as Record<string, string>;
            const message = auth.message;
            const signature = auth.signature;
            const payer = auth.payer;
            const ciphertext = auth.ciphertext;
            const mint = auth.mint;
            const paymentReceiver = auth.paymentReceiver;
            const sourceHandle = auth.sourceHandle;
            const destHandle = auth.destHandle;
            if (!message || !signature || !payer || !ciphertext || !mint || !paymentReceiver || sourceHandle == null || destHandle == null) {
                throw new Error("authorization must include message, signature, payer, ciphertext, mint, paymentReceiver, sourceHandle, destHandle");
            }
            let koraForPayer: { getPayerSigner: () => Promise<{ signer_address: string }> };
            try {
                koraForPayer = await getKoraClient();
            } catch (e: any) {
                if (e?.code === "MODULE_NOT_FOUND" || e?.message?.includes("Cannot find module")) {
                    res.status(503).json({ transaction: "", success: false, network: NETWORK, errorReason: "Kora SDK not built. Run: yarn kora:build-sdk" });
                    return;
                }
                throw e;
            }
            const { signer_address: feePayer } = await koraForPayer.getPayerSigner();
            console.log(`Building unsigned tx (payer: ${payer}, feePayer: ${feePayer})...`);
            const unsignedB64 = await buildAuthTx({
                message,
                signature,
                payer,
                ciphertext,
                mint,
                paymentReceiver,
                sourceHandle,
                destHandle,
                feePayer,
            });
            console.log(`Returning unsigned tx to client (requiresPayerSignature: true)...`);
            res.json({
                success: false,
                network: NETWORK,
                requiresPayerSignature: true,
                unsignedTransaction: unsignedB64,
                errorReason: undefined,
            } as SettleResponse & { requiresPayerSignature?: boolean; unsignedTransaction?: string });
            return;
        } else {
            // Legacy: client sends signed transaction
            const tx = payload?.transaction;
            if (typeof tx !== "string") {
                throw new Error("payload must include transaction (base64) or authorization");
            }
            console.log("Received user-signed transaction, forwarding to Kora...");
            transactionBase64 = tx;
        }

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

        // When client sends a partially-signed tx (payer signed, fee payer not yet), skip sig
        // verification so Kora can add its signature without "Missing signature" error.
        console.log("Sending partially-signed tx to Kora (sig_verify: false)...");
        const result = await kora.signAndSendTransaction({
            transaction: transactionBase64,
            sig_verify: false,
        });

        if (!result?.signed_transaction) {
            const errMsg = (result as any)?.error?.message ?? (result as any)?.message ?? "Kora returned no signed transaction.";
            console.error(`Kora signAndSendTransaction failed: ${errMsg}`);
            throw new Error(errMsg);
        }

        const txSignature = getTxSignatureFromSerialized(result.signed_transaction);
        const response: SettleResponse = {
            transaction: txSignature,
            success: true,
            network: NETWORK,
        };

        console.log(`✓ Payment settled successfully: ${txSignature}`);
        res.json(response);
    } catch (error: any) {
        console.error("✗ Payment settlement failed:", error);
        const errorReason = normalizeSettleError(error);
        const response: SettleResponse = {
            transaction: "",
            success: false,
            network: NETWORK,
            errorReason,
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
