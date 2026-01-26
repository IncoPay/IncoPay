# Complete Run Guide

## ✅ Token Deployment Complete!

Your custom SPL token has been deployed:
- **Mint Address:** `AoJYHaw2fJojxwiFcyuwFaukUKdJ9BNPAVM1v9PmenKy`
- **Symbol:** INCO
- **Supply:** 1,000,000 INCO
- **Decimals:** 9

## Next Steps: Running the Full System

You'll need **3 terminal windows** to run everything:

### Terminal 1: Start Next.js Dev Server (UI)

```bash
# From my-app/ directory
yarn dev
```

This starts the web UI on `http://localhost:3000` (Next.js default port)

**Note:** The facilitator also uses port 3000, so we'll change the facilitator port to 3001.

### Terminal 2: Start Kora RPC Server

**First, build the Kora SDK:**
```bash
# From my-app/ directory
yarn kora:build-sdk
```

**Then start Kora:**
```bash
# From my-app/ directory
yarn kora:start
```

**OR manually:**
```bash
cd ../kora
kora --config kora.toml --rpc-url https://api.devnet.solana.com rpc start --signers-config signers.toml
```

This starts Kora on `http://localhost:8080`

**Important:** Make sure Kora is installed and SDK is built:
```bash
yarn kora:install
yarn kora:build-sdk  # Build the TypeScript SDK
```

### Terminal 3: Start Facilitator Server

First, update `.env.local` to use port 3001 (to avoid conflict with Next.js):

```bash
# Edit .env.local and change:
FACILITATOR_PORT=3001
```

Then start the facilitator:
```bash
# From my-app/ directory
yarn facilitator
```

This starts the facilitator on `http://localhost:3001`

## Testing the Routes

### 1. Test Facilitator (`/test1`)

Navigate to: `http://localhost:3000/test1`

**What to test:**
- ✅ Click "Check Health" - Should show facilitator is OK
- ✅ Click "Get Supported" - Should show supported payment schemes
- ✅ Connect wallet
- ✅ Click "Test Payment via Facilitator" - Tests x402 payment flow

### 2. Test Token Deployment & Confidential Transfer (`/test`)

Navigate to: `http://localhost:3000/test`

**What you'll see:**
- ✅ Token deployment section (already done!)
- ✅ Token mint address displayed
- ✅ Confidential transfer interface
- ✅ Link to `/test1` for facilitator testing

**What to test:**
- Connect wallet
- Enter amount to transfer
- Encrypt amount
- Enter destination account
- Execute confidential transfer

## Quick Start Commands

```bash
# Terminal 1: UI
cd my-app
yarn dev

# Terminal 2: Kora
cd my-app
yarn kora:start

# Terminal 3: Facilitator
cd my-app
# First update .env.local: FACILITATOR_PORT=3001
yarn facilitator
```

## Troubleshooting

### Port Conflicts

If you get "port already in use":
- Next.js uses port 3000 by default
- Facilitator uses port 3000 by default
- **Solution:** Change facilitator to port 3001 in `.env.local`

### Kora Not Found

If `kora` command not found:
```bash
yarn kora:install
```

### Facilitator Can't Connect to Kora

Check:
1. Kora is running on port 8080
2. `KORA_RPC_URL=http://localhost:8080/` in `.env.local`
3. `KORA_API_KEY` matches `kora.toml` config

### Wallet Connection Issues

- Make sure you're on Solana Devnet
- Use a wallet like Phantom or Solflare
- Ensure wallet has devnet SOL

## Environment Variables Checklist

Make sure `.env.local` has:

```env
# Kora
KORA_RPC_URL=http://localhost:8080/
KORA_API_KEY=kora_facilitator_api_key_example

# Facilitator
FACILITATOR_PORT=3001  # Changed from 3000
NETWORK=solana:devnet

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Token (auto-saved after deployment)
NEXT_PUBLIC_TOKEN_MINT=AoJYHaw2fJojxwiFcyuwFaukUKdJ9BNPAVM1v9PmenKy

# Facilitator URL (for frontend)
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3001

# Payer (auto-generated)
PAYER_PRIVATE_KEY=[...]
```

## Expected Flow

1. ✅ **Token Deployed** - Done!
2. 🔄 **Start Services** - Kora + Facilitator + Next.js
3. 🔄 **Test `/test1`** - Test facilitator endpoints
4. 🔄 **Test `/test`** - Test confidential transfers
5. 🔄 **Integrate** - Connect facilitator to confidential transfers (future)

## Next Integration Steps

Once everything is running:
1. Test facilitator health and supported endpoints
2. Test x402 payment flow
3. Integrate facilitator with confidential token transfers
4. Add payment requirements to protected endpoints
