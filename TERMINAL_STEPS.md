# Terminal steps – what to run and in what order

Run these in **separate terminals** from the **my-app** directory (`cd` into `my-app` first).

---

## 1. Install dependencies (once)

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn install
```

---

## 2. Start Kora (Terminal 1)

Kora is the fee-payer service. The facilitator needs it for blockhash and to sign/send transactions.

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn kora:start
```

Or manually (from repo root):

```bash
cd /Users/ayush/Desktop/inco-solana/kora
kora --config kora.toml --rpc-url https://api.devnet.solana.com rpc start --signers-config signers.toml
```

Leave this running. You should see Kora listening (e.g. on port 8080).

---

## 3. Start the facilitator (Terminal 2)

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn facilitator
```

Leave this running. It will listen on **http://localhost:3001**.

---

## 4. Start the Next.js app (Terminal 3)

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn dev
```

Leave this running. Open **http://localhost:3000** in the browser.

---

## 5. After `anchor build` (you just did this)

With **facilitator** and **UI** already running, do this next:

**Copy the built IDL into the app** (so facilitator and frontend use the same instruction layout):

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn copy-idl
```

**If the program is not deployed to devnet yet** (first time), or you need to **update** the deployed program:

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn deploy-inco-token
```

(Requires Solana CLI, devnet SOL, and correct config. See `lightning-rod-solana/DEPLOY_ALTERNATIVES.md` if deploy fails.)

**If the program is already deployed and you didn’t change instructions:**  
You can skip deploy. Just `yarn copy-idl` and use the app.

---

## 6. After deploying IncoToken (facilitator + UI already running)

Deploy already copied the IDL. Next:

1. **Mint / env** – If you use a custom IncoToken mint, set in **my-app/.env.local**:
   - `NEXT_PUBLIC_TOKEN_MINT=<your_inco_mint_address>`
   - `NEXT_PUBLIC_PAYMENT_RECEIVER=<receiver_wallet>` (optional; has a default)

2. **IncoToken accounts** – Your wallet and the payment receiver must each have an **IncoToken account** for that mint (create via your app’s setup or `yarn setup-inco-token` if you have it). Your wallet needs at least **1 INCO** balance.

3. **Use the app** – Go to step 7 below.

---

## 7. Use the X402 demo (/test2)

1. Go to **http://localhost:3000/test2**
2. Connect your wallet (devnet).
3. Click **Pay 1 INCO**.
4. Sign the **message** when the wallet asks.
5. Sign the **transaction** when the wallet asks (once).
6. The facilitator completes the payment and you see the result.

---

## Optional: Rebuild / redeploy IncoToken

Only if you changed the IncoToken program (e.g. `lightning-rod-solana/programs/inco-token`).

**Build:**

```bash
cd /Users/ayush/Desktop/inco-solana/my-app/lightning-rod-solana
anchor build
# or: cargo build-sbf -p inco-token
```

**Copy IDL into the app (no redeploy):**

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn copy-idl
```

**Redeploy to devnet (if you have a deployed program):**

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn deploy-inco-token
```

(Requires Solana CLI, devnet SOL, and correct `Anchor.toml` / keypairs.)

---

## Optional: Build Kora TypeScript SDK

If the facilitator fails with “Cannot find module '@solana/kora'”:

```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn kora:build-sdk
```

Then restart the facilitator (Terminal 2).

---

## Summary

| Terminal | Command           | Purpose                    |
|----------|-------------------|----------------------------|
| 1        | `yarn kora:start` | Kora RPC (fee payer)       |
| 2        | `yarn facilitator` | Facilitator API (port 3001) |
| 3        | `yarn dev`        | Next.js app (port 3000)     |

All three should be running to use the /test2 X402 payment flow.

---

## If you see "Missing signature for public key [9XY...]"

Kora must run a build that **skips signature verification** for partially-signed txs. Do this:

**1. Rebuild Kora (from repo root or kora dir):**
```bash
cd /Users/ayush/Desktop/inco-solana/kora
cargo build --release
```

**2. Stop the running Kora** (in the terminal where Kora is running: **Ctrl+C**).

**3. Start Kora again:**
```bash
cd /Users/ayush/Desktop/inco-solana/my-app
yarn kora:start
```

Then try Pay 1 INCO on /test2 again.
