# Test IncoToken on the Frontend

## Program ID (Deployed)

**IncoToken Program ID:** `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi`

This is already set in `app/test/utils/confidentialTransfer.ts`.

## Before Testing: Upload IDL & Copy to Public

**Run these from `lightning-rod-solana/`** (not from my-app).  
`target/idl/` and `../public/` are relative to that folder.

```bash
# Go to lightning-rod-solana first
cd lightning-rod-solana

# 1. Upload IDL to the program (so frontend can fetch it on-chain)
anchor idl init \
  --filepath target/idl/inco_token.json \
  9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi \
  --provider.cluster devnet

# 2. Create my-app/public/idl and copy IDL (fallback if on-chain fails)
mkdir -p ../public/idl
cp target/idl/inco_token.json ../public/idl/inco_token.json
```

## Wallet: Local vs Frontend

| Where | Wallet used |
|-------|-------------|
| **Deployment** | Solana CLI default keypair: `~/.config/solana/id.json` |
| **Frontend (/test)** | **Your connected browser wallet** (Phantom, Solflare, etc.) via "Connect Wallet" |

So:

- **No separate "local wallet"** is used by the UI. The UI uses whatever wallet you connect in the browser.
- The **deploy** used the keypair from `solana config` (usually `~/.config/solana/id.json`).
- On the **test page**, you click "Connect Wallet" and use Phantom/Solflare/etc. That can be the same keypair (if you imported it) or a different one.

## How to Try the Frontend

1. **Finish IDL setup** (commands above).

2. **Start the app** (from `my-app/`):
   ```bash
   yarn dev
   ```

3. **Open the test page:**
   - Go to: `http://localhost:3000/test`

4. **Connect your wallet**
   - Click "Connect Wallet" and approve in Phantom/Solflare.
   - Source account is auto-filled from the connected wallet address.

5. **Use devnet**
   - Ensure your wallet and the app are on **Devnet** (same network you deployed to).

## Summary

- **Program ID:** `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi` (already in code).
- **Frontend wallet:** The one you connect in the browser on `/test` (your own wallet).
- **Deploy wallet:** CLI keypair (`~/.config/solana/id.json`); can be same or different from the one you use in the UI.
