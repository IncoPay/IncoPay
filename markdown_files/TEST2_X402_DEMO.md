# /test2 – X402 Demo (Pay 1 INCO)

This doc describes the **/test2** page and the X402-style confidential payment flow.

**→ For the exact flow steps and how to fix recurring errors, see [TEST2_FLOW_AND_ERRORS.md](./TEST2_FLOW_AND_ERRORS.md).**

## 1. /test2 page (`app/test2/page.tsx`)

**X402 demo flow (two-step: sign message, then sign transaction):**

1. **Connect wallet** (required).
2. **“Pay 1 INCO”**:
   - Get ciphertext for 1 token from facilitator **POST /getAmount**.
   - Build a JSON message (ciphertext, amount, recipient, nonce).
   - **Sign message** with the wallet.
   - **POST /verify** with signature, message, ciphertext, payer, accounts.
   - Run a **simulation** (transfer tx) to get source/dest handles.
   - **POST /settle** with **authorization** → facilitator returns **unsigned tx** (`requiresPayerSignature: true`).
   - **User signs the transaction** in the wallet (required for inco-lightning CPI).
   - Client **POST /settle** again with **signed tx** → facilitator sends to Kora; Kora adds fee-payer signature and submits.
   - On success, show **“API data”** (mock JSON) and a Solscan link.

**Env:**

- **NEXT_PUBLIC_FACILITATOR_URL** (default `http://localhost:3001`).
- **NEXT_PUBLIC_TOKEN_MINT** (IncoToken mint).
- **NEXT_PUBLIC_PAYMENT_RECEIVER** (receiver wallet for the 1 INCO payment).  
  If not set, the app uses the default merchant/receiver: `E9cRHNKU5wWVtovCRsSwnL1zvmVsLjiHrtQvRcHx6uyS`.

## 2. Link from /test

On **/test** there is a link **“X402 Demo →”** that goes to **/test2**.

## 3. Flow for your demo video

- **User** only signs a **message** (encrypted amount + context). **No transaction signing** in the wallet.
- **Facilitator**:
  - Returns ciphertext (**getAmount**).
  - Verifies the message signature (**verify**).
  - **Builds** the transaction: [Ed25519 verify, IncoToken **transfer_with_authorization**].
  - **Signs** as fee payer (Kora) and **submits** (**settle**).
- After settle, the UI shows the revealed **“API data”**.

The IncoToken program has a **transfer_with_authorization** instruction that checks the previous instruction (index 0) was Ed25519 sig verify and that the verified signer is the source owner, then performs the confidential transfer. The user never signs a transaction.

---

## 3a. “No client-side transaction – only signing” and how API data is released

**“There is no client-side transaction. Only signing done by user.”**  
That means the **user never submits a transaction from the client**. The user only **signs** (a message and/or an authorization). The **transaction** (the actual transfer of tokens) is **sent by the facilitator**, not by the user’s wallet from the browser.

**“Without paying, how will API data be released? You mean we need to send money to the merchant who is giving API data from the backend?”**  
Yes: the merchant’s backend only releases API data **after** payment is done. The payment **does** happen – the facilitator does it for you.

**“That is why the facilitator is there. It calls the settle. You need to authorize the facilitator to spend on your behalf with a signature.”**

- **You** (user) only **sign** an authorization (e.g. a message that commits to “I pay X to merchant Y” with encrypted amount). That signature says: “I authorize this payment.” You do **not** sign any transaction.
- **Facilitator** then:
  1. **Verifies** your signature (**/verify**).
  2. **Calls settle** – it **builds** the transaction (Ed25519 verify + **transfer_with_authorization**), **signs** as fee payer (Kora), and **submits** it. So the **facilitator** is the one that actually sends the transaction. You are **authorizing the facilitator to spend on your behalf** with your message signature.
- **Merchant backend** sees that payment was completed (e.g. via facilitator or on-chain) and then **releases the API data** to you.

So: **no client-side transaction** = the client never “sends” the payment tx; the user only **signs**. The **facilitator** is there to **call settle** (execute the payment) once you have authorized it with your signature. The money does go to the merchant; the facilitator is the one that makes that transfer happen (on your behalf), and only after that does the backend release the API data.

---

## 3b. Ed25519 signature verification (where it happens)

**Where is the sig verification step?**  
Ed25519 verification happens in **two places**:

1. **Off-chain (fast check):** When you call **POST /verify**, the facilitator verifies that `payer` signed `message` using **Ed25519** (`nacl.sign.detached.verify` in `app/facilator/server.ts`). If valid, the flow continues.
2. **On-chain (in settle):** The transaction sent to **POST /settle** is built with **two instructions**:
   - **First instruction:** Native **Ed25519** program (`Ed25519SigVerify111111111111111111111111111`) – verifies the same message/signature/payer on-chain.
   - **Second instruction:** IncoToken confidential transfer.

So the **signature verification step** for the payment is the **on-chain** Ed25519 instruction; it runs **before** the transfer in the same transaction. The Solana transaction on Solscan will show the Ed25519 program call followed by the IncoToken transfer. The facilitator’s **/verify** call is a fast off-chain check before building/signing; the authoritative verification for the payment is on-chain in the settle transaction.

---

## 4. Kora “Program not in the allowed list”

If you see **“Program 9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi is not in the allowed list”** when signing/settling the transfer, Kora is rejecting the transaction because the IncoToken program is not in its allowed list.

**Fix:** In the **Kora** repo (e.g. `kora/kora.toml`), add these to `[validation]` → `allowed_programs`:

- `Ed25519SigVerify111111111111111111111111111` (Ed25519 sig verify – used on-chain before transfer)
- `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi` (IncoToken)
- `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` (Inco Lightning)

Then **restart Kora** (and the facilitator if it talks to Kora). After that, “Pay 1 INCO” and settle should work.

---

## 5. Kora “Insufficient token payment. Required X lamports”

If you see **“Insufficient token payment. Required 93555 lamports”** (or similar), Kora is requiring a **token payment** (fee) for signing the transaction. The X402 demo tx only contains the IncoToken confidential transfer and does not include a separate SPL token payment to Kora.

**Fix:** In **Kora**’s config (`kora/kora.toml`), under `[validation.price]`, set:

```toml
type = "free"
```

So Kora does not require a payment. With `type = "margin"` or `type = "fixed"`, Kora expects the transaction to include a payment instruction (e.g. SPL transfer to its payment address). For the demo, `type = "free"` avoids that.

Then **restart Kora**. After that, “Pay 1 INCO” and settle should work without the token payment error.

---

## 6. “Custom program error: 0x65” (InstructionFallbackNotFound)

If you see **“Error processing Instruction 1: custom program error: 0x65”** (or **Error 101**), the **on-chain IncoToken program** does not include the **transfer_with_authorization** instruction. Error 0x65 = **InstructionFallbackNotFound**: the program received an instruction it doesn’t recognize.

**Fix:** Rebuild and **redeploy** the IncoToken program so the deployed program has `transfer_with_authorization`:

```bash
cd my-app/lightning-rod-solana
anchor build
# Deploy to devnet (same program ID as before, or update .env if you use a new keypair)
solana program deploy target/deploy/inco_token.so --program-id target/deploy/inco_token-keypair.json --url devnet
# Copy the new IDL so the facilitator uses the latest
cp target/idl/inco_token.json ../public/idl/inco_token.json
```

Then restart the facilitator. The X402 “message-only signing” flow needs this deployed program version.

---

## 7. "Cross-program invocation with unauthorized signer or writable account"

If you see **"Error processing Instruction 1: Cross-program invocation with unauthorized signer or writable account"**, the IncoToken program is calling the Inco Lightning program (CPI) with the **payer** account as a signer. The payer is only authorized by the Ed25519 message signature, not as a transaction signer, so the runtime rejects the inner instruction.

**Fix (in IncoToken):** The `transfer_with_authorization` path uses **raw CPI** to inco-lightning: it builds the inner instructions (e.g. `new_euint128`, `e_ge`, `e_sub`, `e_add`) manually and passes the payer account with **is_signer: false**. That avoids the runtime check. This is implemented in `programs/inco-token/src/token.rs` via `inco_invoke_with_unsigned_owner` and relies on inco-lightning exposing return data for the homomorphic handles; if the deployed inco-lightning program does not set return data for these instructions, you may need to rebuild/redeploy IncoToken and ensure inco-lightning is a version that supports return data, or use a flow where the user signs the transaction (payer as tx signer). The X402 “message-only signing” flow needs this deployed program version.
