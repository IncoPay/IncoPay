# /test2 – X402 Demo (Pay 1 INCO)

This doc describes the **/test2** page and the X402-style confidential payment flow.

## 1. /test2 page (`app/test2/page.tsx`)

**X402 demo flow:**

1. **Connect wallet** (required).
2. **“Pay 1 INCO”**:
   - Get ciphertext for 1 token from facilitator **POST /getAmount**.
   - Build a JSON message (ciphertext, amount, recipient, nonce).
   - **Sign message** with the wallet (no tx yet).
   - **POST /verify** with signature, message, ciphertext, payer, accounts.
   - Build the confidential transfer tx (same as /test: source/dest IncoToken PDAs, ciphertext, allowance PDAs).
   - Get fee payer from **GET /supported** and set it on the tx.
   - **Sign the transaction** in the wallet.
   - **POST /settle** with the signed tx (base64).
   - On success, show **“API data”** (mock JSON) and a Solscan link.

**Env:**

- **NEXT_PUBLIC_FACILITATOR_URL** (default `http://localhost:3001`).
- **NEXT_PUBLIC_TOKEN_MINT** (IncoToken mint).
- **NEXT_PUBLIC_PAYMENT_RECEIVER** (receiver wallet for the 1 INCO payment).  
  If not set, the app uses the default merchant/receiver: `E9cRHNKU5wWVtovCRsSwnL1zvmVsLjiHrtQvRcHx6uyS`.

## 2. Link from /test

On **/test** there is a link **“X402 Demo →”** that goes to **/test2**.

## 3. Flow for your demo video

- **User** does not send the tx from the app; they only:
  - Sign a **message** (encrypted amount + context).
  - Sign the **transfer transaction** (built by the app).
- **Facilitator**:
  - Returns ciphertext (**getAmount**).
  - Verifies the message signature (**verify**).
  - Submits the signed tx (**settle**).
- After settle, the UI shows the revealed **“API data”**.

**Optional later:** add a **transferWithAuthorization** instruction on the IncoToken program so the user only signs a message and the facilitator builds and sends the transfer tx (no user-signed tx). The current setup works for the demo with the user signing both the message and the transfer tx.

---

## 4. Kora “Program not in the allowed list”

If you see **“Program 9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi is not in the allowed list”** when signing/settling the transfer, Kora is rejecting the transaction because the IncoToken program is not in its allowed list.

**Fix:** In the **Kora** repo (e.g. `kora/kora.toml`), add these to `[validation]` → `allowed_programs`:

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
