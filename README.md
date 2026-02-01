# IncoPay

**Private payments on Solana** — X402-style confidential token transfers with message-based authorization and facilitator-paid gas, powered by [Inco Network](https://inco.org).

We built **private X402 on Solana** using **Inco Network**. The stack uses the **Inco Lightning** program for confidential SPL token transfers and **Kora** only as the facilitator service—fee payer and transaction submission—so users get a gasless, one-sign flow.

On the **facilitator** we added full support for ciphertext and the payment lifecycle: **getAmount** returns an encrypted amount (ciphertext) for the transfer; **verify** validates the user’s Ed25519 signature over the payment message (ciphertext, amount, recipient); and **settle** runs in two steps—it first returns an unsigned transaction for the user to sign once, then accepts the signed transaction and forwards it to Kora for fee-payer signature and submission. Ciphertext is read and passed through the whole flow so amounts stay confidential until settlement; Kora is used only for paying fees and sending the transaction, not for generating or verifying ciphertext.

On-chain, the flow uses Ed25519 signature verification and the IncoToken program’s **transfer_with_authorization** so the confidential transfer is tied to the signed message. The result is private, gasless X402-style payments on Solana with Inco Lightning for confidentiality and Kora for the facilitator’s fee-payer role.

---

## What We Built

- **Landing page** — Hero, Get Started, and Docs (Coming soon) with Solana + Inco branding.
- **Get Started (/started)** — Pay 1 INCO: sign message, then sign transaction once. Status, Solscan link, and revealed API data. Facilitator submits via Kora; user pays no gas.
- **Facilitator** — Express API (`/getAmount`, `/verify`, `/settle`) that builds unsigned transactions, returns them for user signature, then forwards signed transactions to Kora for fee-payer signature and submission.
- **IncoToken program** — `transfer_with_authorization`: verifies Ed25519 message signature from the previous instruction, then performs confidential transfer (inco-lightning CPIs currently skipped for flow testing).
- **Kora integration** — Fee payer service: blockhash, sign-and-send with `sig_verify: false` for partially signed transactions.

**Flow:** User signs a message (authorization) → facilitator returns unsigned tx → user signs tx once → facilitator sends to Kora → Kora adds fee payer signature and submits. User never pays gas.

**Example completed transaction (devnet):** [Solscan: 2TwVk6Eky67RCzYHm82Ckm2wHeu4z8ZLbHGhZJYEpyu6wJ4v8A4Ez1oxN9HjxNWW8K63eREryACFTsUULzoRFqYB](https://solscan.io/tx/2TwVk6Eky67RCzYHm82Ckm2wHeu4z8ZLbHGhZJYEpyu6wJ4v8A4Ez1oxN9HjxNWW8K63eREryACFTsUULzoRFqYB?cluster=devnet)

---

## Tech Stack

| Layer        | Stack |
|-------------|--------|
| Frontend    | Next.js 16, React, Solana Wallet Adapter, Anchor, `@inco/solana-sdk`, `@x402/core` / `@x402/svm` |
| Facilitator | Express, `@solana/kora` (local SDK), `@coral-xyz/anchor` |
| Programs    | Anchor (IncoToken on Solana devnet), Inco Lightning (external) |
| Fee payer   | Kora (Rust; local or deployed) |

**Kora & Facilitator (IncoPay fork):** [IncoPay-KoraFacilator](https://github.com/ayushsingh82/IncoPay-KoraFacilator)

### KoraFacilator

- **Repo:** [IncoPay-KoraFacilator](https://github.com/ayushsingh82/IncoPay-KoraFacilator)

**Changes made for IncoPay (Kora / Facilitator / IncoToken / Frontend):**

- **Kora — allowed programs:** Added support so fee-payer transactions can include:
  - `Ed25519SigVerify111111111111111111111111111` — Ed25519 sig verify (on-chain before transfer)
  - `ComputeBudget111111111111111111111111111111` — Compute Budget Program
  - `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi` — IncoToken (confidential SPL)
  - `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` — Inco Lightning (CPI from IncoToken)
- **Kora — partially signed tx:** Force `sig_verify = false` when resolving so Kora does not reject the tx before adding the fee-payer signature.
- **Facilitator:** Two-step settle — return unsigned tx for user to sign, then accept signed tx and forward to Kora.
- **IncoToken program:** Use relative instruction index (`current_ix_index - 1`) for Ed25519 verification so it works when Kora prepends compute-budget instructions; inco-lightning CPIs temporarily skipped for flow testing.
- **Inco Lightning program:** No changes were made to the Inco Lightning program itself. It is used as an external dependency (crate `inco-lightning` 0.1.4 with CPI feature) and as the on-chain program at `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`. IncoToken invokes it via CPI for confidential ops (e.g. `e_sub`, `e_add`, `e_ge`); in `transfer_with_authorization` those CPIs are temporarily skipped so the signing/submission flow can be tested without the CPI signer issue.
- **Frontend:** Serialize partially signed tx with `requireAllSignatures: false` and `verifySignatures: false` before sending to facilitator.

---

## On-chain program IDs (devnet)

Inco cSPL token–related programs (use in Kora `allowed_programs` / config):

```
"ComputeBudget111111111111111111111111111111",   # Compute Budget Program
"9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi", # IncoToken (confidential SPL)
"5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj", # Inco Lightning (CPI from IncoToken)
```

| Program | Address | Role |
|--------|---------|------|
| Compute Budget | `ComputeBudget111111111111111111111111111111` | Compute budget (Kora adds instructions) |
| IncoToken (confidential SPL) | `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi` | Confidential token transfer |
| Inco Lightning | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` | CPI from IncoToken (FHE ops) |

Use these in Kora `allowed_programs` (or equivalent config) so the fee-payer can sign transactions that call them.

---

## Prerequisites

- **Node.js** 18+ and **Yarn**
- **Rust** and **Cargo** (for Kora)
- **Solana CLI** and **Anchor** (for IncoToken build/deploy)
- **Kora** repo sibling to `my-app` (e.g. `../kora`) with built SDK at `kora/sdks/ts`) — only for running the facilitator locally

---

## Deploying to Vercel (UI only)

The app is set up so **Vercel can build and deploy the UI** without the Kora repo. The `@solana/kora` dependency is not in `package.json` (it used a local `file:../kora/sdks/ts` path that doesn’t exist on Vercel). A type stub in `types/kora.d.ts` lets the build succeed; the facilitator (which uses Kora) is intended to run **separately** (e.g. on another host or locally). For **local full stack** (facilitator + Kora), clone the Kora repo as a sibling, build the SDK (`yarn kora:build-sdk`), and add the dependency back: `yarn add file:../kora/sdks/ts` (or use the [IncoPay-KoraFacilator](https://github.com/ayushsingh82/IncoPay-KoraFacilator) repo and point to its SDK if published).

---

## How to Build and Run

### 1. Install dependencies

```bash
cd my-app
yarn install
```

### 2. Build Kora SDK (if facilitator can’t find `@solana/kora`)

```bash
yarn kora:build-sdk
```

### 3. Configure environment

Copy and edit `.env.local` (see [Environment](#environment) below). Required for facilitator/Kora:

- `KORA_PRIVATE_KEY` — used by `start-kora.sh` and Kora signers config.

### 4. Run the stack (three terminals)

From `my-app`:

| Terminal | Command            | Purpose              | Port  |
|----------|--------------------|----------------------|-------|
| 1        | `yarn kora:start`   | Kora RPC (fee payer) | 8080  |
| 2        | `yarn facilitator` | Facilitator API      | 3001  |
| 3        | `yarn dev`         | Next.js app         | 3000  |

Then open:

- **Home:** [http://localhost:3000](http://localhost:3000)
- **Pay 1 INCO (started):** [http://localhost:3000/started](http://localhost:3000/started)
- **X402 demo (test2):** [http://localhost:3000/test2](http://localhost:3000/test2)

### 5. Build and deploy IncoToken (first time or after program changes)

```bash
cd lightning-rod-solana
anchor build
cd ..
yarn deploy-inco-token
```

Restart the facilitator after deploy. Ensure IncoToken mint and payment receiver are set in `.env.local` (see [Environment](#environment)).

### 6. Rebuild Kora (after Kora code changes)

```bash
cd ../kora
cargo build --release
cd ../my-app
# Stop Kora (Ctrl+C in Terminal 1), then:
yarn kora:start
```

---

## Project Structure

```
my-app/
├── app/
│   ├── page.tsx               # Home (Landing)
│   ├── started/page.tsx       # Get Started — Pay 1 INCO (status, Solscan, API data)
│   ├── facilator/
│   │   ├── server.ts          # Facilitator API (getAmount, verify, settle)
│   │   └── ...
│   ├── test/utils/
│   │   └── confidentialTransfer.ts  # IncoToken helpers, simulation
│   └── components/            # Landing, WalletButton, etc.
├── lightning-rod-solana/      # IncoToken Anchor program
│   └── programs/inco-token/
├── public/idl/
│   └── inco_token.json        # IncoToken IDL (copied after build)
├── start-kora.sh              # Starts Kora with KORA_PRIVATE_KEY from .env.local
├── TERMINAL_STEPS.md          # Quick run reference
└── markdown_files/
    └── TEST2_FLOW_AND_ERRORS.md  # Flow details, fixes, troubleshooting
```

---

## Environment

### How to set up `.env`

Use either **`.env`** or **`.env.local`** in the `my-app` folder (Next.js loads both; `.env.local` overrides `.env`). You can:

1. **Copy from an existing file** — If you have `.env.local` from a previous setup, copy it to the repo root as `.env` or `.env.local` and adjust values as needed.
2. **Create from the template below** — Copy the example block into a new file named `.env` or `.env.local` in `my-app/`, then fill in the placeholders.

**Required for running the stack:**

| Variable | What to put |
|----------|-------------|
| **KORA_PRIVATE_KEY** | Base58 or hex private key (or JSON array of bytes) for the Kora fee-payer keypair. Required for `yarn kora:start`. |
| **NEXT_PUBLIC_TOKEN_MINT** | Your IncoToken mint address (set after deploying IncoToken or use an existing devnet mint). |
| **NEXT_PUBLIC_PAYMENT_RECEIVER** | Solana wallet address that receives the 1 INCO payment (merchant/receiver). |
| **NEXT_PUBLIC_FACILITATOR_URL** | Facilitator base URL, e.g. `http://localhost:3001` for local dev. |
| **FACILITATOR_PORT** | Port the facilitator listens on (e.g. `3001`). |
| **KORA_RPC_URL** | Kora RPC URL (e.g. `http://localhost:8080/` when running Kora locally). |
| **KORA_API_KEY** | API key for Kora (e.g. `kora_facilitator_api_key_example` for local). |

**Optional:** `RPC_URL` — Public Solana RPC (e.g. `https://api.devnet.solana.com`); used by facilitator for blockhash if Kora is unavailable.

**Example `.env` or `.env.local`:**

```env
# Facilitator
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3001
FACILITATOR_PORT=3001

# Kora (for start-kora.sh and facilitator)
KORA_RPC_URL=http://localhost:8080/
KORA_API_KEY=kora_facilitator_api_key_example
KORA_PRIVATE_KEY=<base58-or-hex-private-key>

# Solana / IncoToken
NEXT_PUBLIC_TOKEN_MINT=<inco-token-mint-address>
NEXT_PUBLIC_PAYMENT_RECEIVER=<receiver-wallet-pubkey>
RPC_URL=https://api.devnet.solana.com
```

- **KORA_PRIVATE_KEY** — Required for `yarn kora:start` (see `start-kora.sh`).
- **NEXT_PUBLIC_TOKEN_MINT** — IncoToken mint (set after deploy or use existing).
- **NEXT_PUBLIC_PAYMENT_RECEIVER** — Default merchant/receiver for the 1 INCO payment.
- **RPC_URL** — Optional; used by facilitator for blockhash if Kora is unavailable.

---

## Key Implementation Details

- **Two-step settle:** Facilitator returns `requiresPayerSignature: true` and `unsignedTransaction` (base64). Client signs with the wallet, then POSTs the signed transaction to `/settle` again; facilitator forwards to Kora, which adds the fee payer signature and submits.
- **Partially signed tx:** Frontend serializes the signed tx with `requireAllSignatures: false` and `verifySignatures: false` so the missing fee payer signature doesn’t cause a client-side error. Kora is built with `sig_verify: false` when resolving so it doesn’t reject the tx before adding its signature.
- **Ed25519 in program:** IncoToken’s `transfer_with_authorization` checks the *previous* instruction (index `current_ix_index - 1`) for Ed25519 sig verify, so it still works when Kora prepends compute-budget instructions.

See `markdown_files/TEST2_FLOW_AND_ERRORS.md` for code-level notes and common errors.

---

## Troubleshooting

| Symptom | What to do |
|--------|------------|
| **Missing signature for public key [9XY...]** | Rebuild Kora (`cd kora && cargo build --release`) and restart `yarn kora:start`. |
| **403 / blockhash** | Use Kora for blockhash or set `RPC_URL` in `.env.local` to a working devnet RPC. |
| **Simulation failed / IncoToken** | Ensure IncoToken mint, receiver, and your wallet have IncoToken ATAs and source has ≥ 1 INCO. |
| **Cannot find module '@solana/kora'** | Run `yarn kora:build-sdk` from `my-app`. |
| **Program error 0x177c (InvalidInstruction)** | Rebuild and redeploy IncoToken (relative Ed25519 index fix). |

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `yarn dev` | Start Next.js dev server (port 3000). |
| `yarn facilitator` | Start facilitator (port 3001). |
| `yarn kora:start` | Start Kora via `start-kora.sh` (port 8080). |
| `yarn kora:build-sdk` | Build Kora TypeScript SDK. |
| `yarn deploy-inco-token` | Build, deploy IncoToken to devnet, copy IDL to `public/idl`. |
| `yarn copy-idl` | Copy IncoToken IDL from `lightning-rod-solana` to `public/idl`. |
| `yarn setup-inco-token` | Setup script for IncoToken accounts (if present). |

---

## Further Documentation

- **Run order and commands:** `TERMINAL_STEPS.md`
- **Flow, fixes, troubleshooting:** `markdown_files/TEST2_FLOW_AND_ERRORS.md`
- **Video script (landing → Get Started → Pay 1 INCO):** `markdown_files/VIDEO_SCRIPT.md`
- **What to read (Kora & Inco Lightning):** `markdown_files/READING_KORA_AND_INCO_LIGHTNING.md`
- **Deploy options:** `lightning-rod-solana/DEPLOY_ALTERNATIVES.md`
- **Facilitator API:** `app/facilator/README.md`

---

## License

See repository root. Inco Network: [inco.org](https://inco.org).
