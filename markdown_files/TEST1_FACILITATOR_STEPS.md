# Steps to Test /test1 (Facilitator)

Use this to verify the facilitator and Kora integration on **http://localhost:3000/test1**.

---

## 1. What /test1 Does

- **Check Health** – Calls `GET /health` on the facilitator. No Kora needed.
- **Get Supported** – Calls `GET /supported`; returns x402 payment kinds and fee payer from **Kora**. **Kora RPC must be running.**
- **Test Payment** – Calls `POST /test-payment` with amount/payer/recipient. Mock response; no real on-chain tx. **Only facilitator needed.**

So you can test Health + Test Payment with just the facilitator; for **Get Supported** you need Kora as well.

---

## 2. Env and Ports

In `my-app/.env.local` you should have:

```env
# Facilitator (port 3001 to avoid clash with Next.js on 3000)
FACILITATOR_PORT=3001
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3001

# Kora (needed for "Get Supported" and real verify/settle)
KORA_RPC_URL=http://localhost:8080/
KORA_API_KEY=kora_facilitator_api_key_example
KORA_PRIVATE_KEY=[...]   # Same format as PAYER_PRIVATE_KEY
```

- **Next.js** → `http://localhost:3000` (e.g. `yarn dev`)
- **Facilitator** → `http://localhost:3001` (e.g. `yarn facilitator`)
- **Kora RPC** → `http://localhost:8080/` (e.g. `yarn kora:start`)

---

## 3. Option A: Test Without Kora (Health + Test Payment)

Good first check: facilitator only.

### Step 1 – Start Next.js

```bash
cd my-app
yarn dev
```

Leave it running. App: **http://localhost:3000**.

### Step 2 – Start the facilitator

In a **second** terminal:

```bash
cd my-app
yarn facilitator
```

You should see something like:

```
FACILITATOR SERVER STARTED
Server listening at http://localhost:3001
```

Leave it running.

### Step 3 – Use /test1

1. Open **http://localhost:3000/test1**.
2. Connect your wallet (e.g. Phantom on Devnet).
3. **Check Health**  
   - Expected: `✅ Facilitator is ok`  
   - Response: `{ "status": "ok", "service": "facilitator" }`.
4. **Test Payment**  
   - Enter amount (e.g. `0.0001`), click **Test Payment via Facilitator**.  
   - Expected: `✅ Test payment successful! (This is a mock endpoint)`  
   - Response: `{ "success": true, "message": "Test payment received", ... }`.

**Get Supported** will fail while Kora is down; that’s expected in this option.

---

## 4. Option B: Full Test (Including Get Supported)

To exercise **Get Supported** (and later verify/settle), Kora RPC must be up.

### Prereqs (one-time)

- **Kora** built/installed (e.g. `yarn kora:install` from `my-app` or `make install` in `kora/`).
- **Kora SDK** built if you use it (e.g. `yarn kora:build-sdk`).
- In repo root, **`kora/kora.toml`** and **`kora/signers.toml`** set up:
  - `signers.toml`: signer uses `private_key_env = "KORA_PRIVATE_KEY"`.
  - `kora.toml`: `allowed_spl_paid_tokens` (and similar) non-empty if needed; `[kora.auth]` `api_key` set if you use it.
- **`KORA_PRIVATE_KEY`** in `my-app/.env.local` (same format as `PAYER_PRIVATE_KEY`).

### Step 1 – Start Kora RPC

In one terminal:

```bash
cd my-app
yarn kora:start
```

This loads `KORA_PRIVATE_KEY` from `.env.local` and runs Kora (from `../kora`) with devnet. Wait until it’s listening (e.g. on 8080).

### Step 2 – Start the facilitator

In a **second** terminal:

```bash
cd my-app
yarn facilitator
```

### Step 3 – Start Next.js

In a **third** terminal:

```bash
cd my-app
yarn dev
```

### Step 4 – Use /test1

1. Open **http://localhost:3000/test1**.
2. Connect wallet.
3. **Check Health** → `✅ Facilitator is ok`.
4. **Get Supported** → `✅ Supported payment schemes retrieved`  
   - Response should include `kinds` with `x402Version`, `scheme`, `network`, `extra.feePayer` (from Kora).
5. **Test Payment** → `✅ Test payment successful! (This is a mock endpoint)`.

---

## 5. Quick Reference

| Action          | Endpoint        | Needs facilitator | Needs Kora |
|-----------------|-----------------|-------------------|------------|
| Check Health    | GET /health     | ✅                | ❌         |
| Get Supported   | GET /supported  | ✅                | ✅         |
| Test Payment    | POST /test-payment | ✅             | ❌         |

---

## 6. Troubleshooting

- **“Cannot reach facilitator”**  
  - Facilitator not running: start it with `yarn facilitator`.  
  - Wrong URL: app uses `NEXT_PUBLIC_FACILITATOR_URL` or falls back to `http://localhost:3001`. Restart dev server after changing env.

- **“Get Supported” fails (500 / Kora error)**  
  - Start Kora with `yarn kora:start`.  
  - Ensure `KORA_RPC_URL=http://localhost:8080/` and that Kora is listening.  
  - Check `kora.toml` / `signers.toml` and `KORA_PRIVATE_KEY`.

- **CORS / wrong port**  
  - Ensure you’re opening the **app** at **http://localhost:3000/test1**, and that the facilitator URL is **http://localhost:3001**. The browser calls the facilitator from the client; CORS is only an issue if you later call it from another origin.

---

## 7. “Get Supported” and Kora SDK

- **Get Supported** calls facilitator `/supported`. If the Kora SDK is **not** built, the facilitator still returns **200** with a fallback payload: `feePayer: "(run yarn kora:build-sdk for real fee payer)"` and `_sdkNotBuilt: true`. So /test1 “Get Supported” **succeeds** and you see that message.
- For a **real** fee payer from Kora, build the SDK and run Kora:
  ```bash
  yarn kora:build-sdk    # from my-app
  yarn kora:start        # then start Kora RPC
  yarn facilitator       # then facilitator
  ```
  Restart the facilitator after `yarn kora:build-sdk`.

## 8. Kora signer: “Account not found”

When you run `yarn kora:start`, Kora logs the signer address, e.g.:

```text
Failed to get balance for signer main_signer (9XYMK2oYWhGMjwuMLURNWaN4YAenbJPNpXrwkZFDHPXP): Account ... not found
```

That means the **Kora signer** (derived from `KORA_PRIVATE_KEY`) has no account on devnet yet. Kora needs that account to exist and have SOL to pay for gas.

**Fix: airdrop SOL to the signer on devnet**

1. Get the signer address from the Kora startup log (the pubkey in the message above), or from your `KORA_PRIVATE_KEY` (e.g. use `solana-keygen pubkey` on the keypair file if you have one).
2. Airdrop devnet SOL to it:
   ```bash
   solana airdrop 2 9XYMK2oYWhGMjwuMLURNWaN4YAenbJPNpXrwkZFDHPXP --url devnet
   ```
   Use the address from **your** Kora log if it’s different.
3. Keep `yarn kora:start` running; the “Account not found” balance warning may persist until the next metrics run, but Kora will work once the account is funded.

## 9. Summary

- **Minimal test:** Start facilitator + Next.js → open /test1 → **Check Health** and **Test Payment**. No Kora.
- **Get Supported:** Works even without Kora SDK (facilitator returns a fallback). For real fee payer: `yarn kora:build-sdk`, then restart facilitator and run Kora.
- **Kora signer:** If Kora says “Account … not found”, airdrop SOL to that address on devnet.
- Facilitator = Express on **3001**; Next.js on **3000**; /test1 uses `NEXT_PUBLIC_FACILITATOR_URL` (default `http://localhost:3001`).
