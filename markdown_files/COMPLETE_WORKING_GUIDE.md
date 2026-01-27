# Complete Working Guide: Lightning Rod → IncoToken → Confidential Transfer

This document describes the end-to-end flow that worked: from the Lightning Rod (IncoToken) program through deploying it, setting up an IncoMint and IncoToken accounts, to a successful confidential transfer on the UI.

---

## 1. What This Stack Does

- **Lightning Rod (IncoToken)** – Solana program for confidential (encrypted) SPL-like tokens. Balances and transfer amounts are encrypted on-chain using Inco Lightning.
- **IncoMint** – A mint account type in the IncoToken program (not the regular SPL mint).
- **IncoToken account (IncoAccount)** – Token account for a wallet + IncoMint. Address is a PDA: `[wallet, program_id, mint]`.
- **Confidential transfer** – Transfer instruction that moves encrypted amounts between IncoToken accounts; only authorized parties can decrypt balances.

The `/test` UI lets you connect a wallet, enter amount and recipient, encrypt the amount, and execute a confidential transfer. When it works you see:

```
✅ Transfer successful!

Amount: 2 Inco Confidential Tokens
From: 2A8awXcM...
To: E9cRHNKU...

Transaction: 4tgzuTD3SKprhqkdQdsYYdeZ4YGKuykHnjS9NTGvUPhwGBu26At9JDuoMFs9yNMgVBbvSabUUnu82RYg4HVs7nao

The transfer amount is encrypted on-chain and only visible to authorized parties.
```

---

## 2. Prerequisites

- **Solana CLI** – `solana --version`
- **Anchor** – `anchor --version` (e.g. 0.31.x)
- **Node.js / Yarn** – for `my-app` and scripts
- **Wallet on Devnet** – Phantom (or similar) set to **Devnet**, with SOL for fees
- **Payer keypair** – A keypair used to pay for deployment and setup (stored as `PAYER_PRIVATE_KEY` in `.env.local`)

---

## 3. Lightning Rod Program: Build & Deploy

The IncoToken program lives in `lightning-rod-solana/`. You build and deploy it, then expose the IDL to the app.

### 3.1 Build

```bash
cd lightning-rod-solana
anchor build
```

### 3.2 Deploy (use `solana program deploy`, not `anchor deploy`)

The program binary is large. Use Solana CLI with enough sign attempts:

```bash
# From lightning-rod-solana/
solana program deploy \
  --program-id target/deploy/inco_token-keypair.json \
  target/deploy/inco_token.so \
  --url devnet \
  --max-sign-attempts 1000
```

Ensure the deployer wallet has enough SOL (e.g. airdrop: `solana airdrop 5 --url devnet`).

Deployed **Program ID**: `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi`

### 3.3 Upload IDL and copy to app

```bash
# Still in lightning-rod-solana/
anchor idl init \
  --filepath target/idl/inco_token.json \
  9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi \
  --provider.cluster devnet

mkdir -p ../public/idl
cp target/idl/inco_token.json ../public/idl/inco_token.json
```

The frontend loads the IDL from chain first; the file in `public/idl/` is a fallback.

---

## 4. Environment (my-app)

In `my-app/.env.local` you need at least:

- **`PAYER_PRIVATE_KEY`** – JSON array of 64 bytes, e.g. `[221,62,...]`. Used by `yarn setup-inco-token` and `yarn deploy-token`.
- **`NEXT_PUBLIC_SOLANA_RPC_URL`** – e.g. `https://api.devnet.solana.com`
- **`NEXT_PUBLIC_SOLANA_NETWORK`** – `devnet`
- **`NEXT_PUBLIC_TOKEN_MINT`** – Set by `yarn setup-inco-token` to the **IncoMint** address (not the SPL mint from `deploy-token`).

The app uses `NEXT_PUBLIC_TOKEN_MINT` as the IncoMint when deriving source/destination IncoToken accounts for the confidential transfer.

---

## 5. Deploying a “Token” for the UI: Two Different Things

- **SPL token (`yarn deploy-token`)** – Creates a regular SPL mint and ATA. Useful for other flows; **not** what the confidential transfer uses.
- **IncoMint + IncoToken accounts (`yarn setup-inco-token`)** – What the `/test` confidential transfer uses. Creates an IncoMint, two IncoToken ATAs (source + recipient), and mints to the source.

For the flow that produced the success message above, you use **`yarn setup-inco-token`**, not `deploy-token`.

---

## 6. Setup IncoMint and IncoToken Accounts

From `my-app/`:

```bash
yarn setup-inco-token
```

This script (in `scripts/setup-inco-token.ts`):

1. **Initializes an IncoMint** – `initialize_mint` with a new keypair.
2. **Creates IncoToken account for your wallet** – `create_idempotent` for the PDA of `(SOURCE_WALLET, mint)`.
3. **Creates IncoToken account for the recipient** – `create_idempotent` for `(RECIPIENT_WALLET, mint)`.
4. **Mints 10 tokens** to your IncoToken account – `mint_to` with encrypted amount and allowance PDA.
5. **Writes `NEXT_PUBLIC_TOKEN_MINT`** in `.env.local` to the new IncoMint address.

Source/recipient addresses are hardcoded in the script (e.g. `2A8awXcMSwNWLZKc9eHqwuGTDP6Up5WhXs7zDmRTnX98` and `E9cRHNKU5wWVtovCRsSwnL1zvmVsLjiHrtQvRcHx6uyS`). Change those constants if you use different wallets.

**Requirements:** `PAYER_PRIVATE_KEY` set, payer has devnet SOL, IncoToken program already deployed, IDL at `lightning-rod-solana/target/idl/inco_token.json` or `public/idl/inco_token.json`.

After it runs, restart the dev server so it picks up the new `NEXT_PUBLIC_TOKEN_MINT`:

```bash
yarn dev
```

---

## 7. How the /test Page Works

1. **Connect wallet** – Phantom (or similar) on **Devnet**.
2. **Source** – The app derives your **IncoToken account** from `(your wallet, NEXT_PUBLIC_TOKEN_MINT)` and shows it. No need to paste it.
3. **Recipient** – You enter the **recipient’s wallet address**. The app derives their IncoToken account from `(recipient wallet, NEXT_PUBLIC_TOKEN_MINT)`.
4. **Amount** – You enter the amount (e.g. `2`).
5. **Encrypt amount** – Uses Inco’s encryption so the transfer amount is encrypted on-chain.
6. **Execute Confidential Transfer** – Builds the `transfer` instruction with:
   - `source` / `destination` = IncoToken ATAs (from step 2 and 3),
   - `authority` = your wallet,
   - Simulates to get balance handles, derives allowance PDAs, then sends the transfer and asks the wallet to sign.

Important: **Source and destination are IncoToken PDAs**, not raw wallet addresses. The UI and `app/test/utils/confidentialTransfer.ts` derive them via `getIncoAssociatedTokenAddress(wallet, mint, programId)` with seeds `[wallet, program_id, mint]`.

---

## 8. Phantom “Insufficient SOL” on Devnet

Phantom may show “account may fail due to insufficient SOL” even when you have plenty of devnet SOL (e.g. 2.5 SOL). That’s a known devnet quirk: it uses cached balance or conservative rent estimates. The confidential transfer only needs normal tx fees (~0.000005 SOL). If you’re on Devnet and have SOL, **approve anyway**; it usually succeeds.

The `/test` page includes a short note above the Execute button explaining this.

---

## 9. Key Addresses and IDs

| What | Value |
|------|--------|
| IncoToken Program ID | `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi` |
| Inco Lightning Program ID | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` |
| IncoMint (after setup) | Set in `NEXT_PUBLIC_TOKEN_MINT` (e.g. `BwSqzNwfSmSKZcnk7Kx3Sa2t5ouEa9VmrARdZMEjxfR3`) |
| Source IncoToken ATA | PDA `[source_wallet, program_id, mint]` |
| Dest IncoToken ATA | PDA `[recipient_wallet, program_id, mint]` |

---

## 10. End-to-End Checklist (What Actually Ran)

- [ ] **Build** – `cd lightning-rod-solana && anchor build`
- [ ] **Deploy program** – `solana program deploy ... --max-sign-attempts 1000` from `lightning-rod-solana/`
- [ ] **IDL** – `anchor idl init ...` then `cp target/idl/inco_token.json ../public/idl/inco_token.json`
- [ ] **Env** – `PAYER_PRIVATE_KEY` and devnet RPC/network in `my-app/.env.local`
- [ ] **Setup IncoToken** – `yarn setup-inco-token` from `my-app/` (creates IncoMint + ATAs + mints to source)
- [ ] **Restart dev server** – `yarn dev` so `NEXT_PUBLIC_TOKEN_MINT` is picked up
- [ ] **Open** – http://localhost:3000/test
- [ ] **Connect** – Wallet on Devnet (e.g. Phantom)
- [ ] **Recipient** – Recipient wallet address (e.g. `E9cRHNKU5wWVtovCRsSwnL1zvmVsLjiHrtQvRcHx6uyS`)
- [ ] **Amount** – e.g. `2` → Encrypt amount → Execute Confidential Transfer
- [ ] **Sign** – Approve in Phantom (ignore “insufficient SOL” on devnet if you have SOL)

When everything is correct you get the success message:

**Status:**  
✅ Transfer successful!  
Amount: 2 Inco Confidential Tokens  
From: 2A8awXcM...  
To: E9cRHNKU...  
Transaction: &lt;signature&gt;  
The transfer amount is encrypted on-chain and only visible to authorized parties.

---

## 11. Summary

- **Lightning Rod** = IncoToken program (confidential SPL-like tokens).
- **Deploy** = `anchor build` + `solana program deploy` + IDL init + copy IDL.
- **Token setup for /test** = `yarn setup-inco-token` (IncoMint + IncoToken ATAs + mint to source), not `yarn deploy-token`.
- **Frontend** = `/test` derives source/dest IncoToken PDAs from wallet + mint, encrypts amount, builds transfer, gets allowance PDAs via simulation, sends tx for wallet sign.
- **Phantom** = Use Devnet; “insufficient SOL” can be ignored when you have SOL; approve and the transfer goes through.

This is the path that produced the working confidential transfer and the success message you saw.
