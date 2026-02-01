# /test2 – Complete flow and recurring errors

One-page reference so the same errors don’t block you.

---

## Actual flow (two-step: message + transaction sign)

1. **Connect wallet** → **Pay 1 INCO**
2. **Sign message** (authorization: ciphertext, amount, receiver, nonce).
3. **Facilitator** builds unsigned tx [Ed25519 verify + transfer_with_authorization], returns `requiresPayerSignature: true` + `unsignedTransaction` (base64).
4. **User signs the transaction** in the wallet (required for inco-lightning CPI).
5. **Client** POSTs signed tx to **/settle** → facilitator sends it to **Kora** (Kora adds fee-payer signature and submits).

---

## Prerequisites (avoid most errors)

| Check | Why |
|-------|-----|
| **Kora running** (e.g. port 8080) | Blockhash + sign-and-send. |
| **Kora: getBlockhash enabled** | Stops “403 Forbidden” when facilitator builds tx. |
| **Facilitator restarted** after code changes | Node loads `server.ts` only at startup. |
| **IncoToken accounts** | Your wallet + payment receiver each have an IncoToken ATA for the mint. |
| **Source balance** | Your IncoToken account has ≥ 1 INCO (or demo price). |
| **RPC** | If not using Kora for blockhash, set `RPC_URL` / `SOLANA_RPC_URL` to a working devnet RPC (e.g. Helius/QuickNode). |

---

## Recurring errors → fix

| Error | Cause | Fix |
|-------|--------|-----|
| **Signature verification failed. Missing signature for public key [9XY...]** | Kora was simulating the tx with signature verification before adding its own signature; the tx is partially signed (only payer). | **Rebuild Kora and restart it** so it runs the version that skips sig verification. In a terminal: `cd /Users/ayush/Desktop/inco-solana/kora` then `cargo build --release`. Stop the running Kora (Ctrl+C), then from my-app run `yarn kora:start` again. |
| **failed to get recent blockhash: 403 Forbidden** | Facilitator uses public Solana RPC for blockhash; it returns 403. | Use **Kora getBlockhash** (ensure Kora is running and getBlockhash is enabled), or set **RPC_URL** / **SOLANA_RPC_URL** in `.env.local` to a devnet RPC that doesn’t 403. Restart facilitator after env change. |
| **Simulation failed. Ensure source/dest IncoToken accounts exist and have balance.** | Simulation failed or handle extraction failed (no IncoToken accounts or wrong format). | Create IncoToken accounts for **your wallet** and **payment receiver** (same mint). Ensure **source has ≥ 1 INCO**. If the UI shows an RPC error (e.g. 403), fix RPC. |
| **Cross-program invocation with unauthorized signer** | Payer must sign the transaction for inco-lightning CPI. | Use the **two-step flow**: facilitator returns unsigned tx → user signs tx → client sends signed tx to /settle. Don’t skip the “sign transaction” step. |

---

## After code changes

- **Facilitator**: restart (`Ctrl+C`, then `yarn facilitator`).
- **Kora**: rebuild and restart the Kora binary so the `sig_verify: false` change is applied.
