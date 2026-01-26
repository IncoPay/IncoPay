# Facilitator Server

This directory contains the x402 protocol facilitator implementation that bridges API payments with Kora's gasless transaction infrastructure.

## Overview

The facilitator acts as a payment processor for x402-protected APIs:
- **Verifies** payment transactions without broadcasting
- **Settles** payments by broadcasting to Solana via Kora
- **Advertises** supported payment schemes

## Setup

### 1. Install Dependencies

```bash
# From my-app directory
yarn install
```

### 2. Build Kora SDK (if needed)

If `@solana/kora` is not available, build it from the Kora repository:

```bash
cd ../kora/sdks/ts
pnpm install
pnpm build
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp app/facilator/.env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Kora Configuration
KORA_RPC_URL=http://localhost:8080/
KORA_API_KEY=kora_facilitator_api_key_example

# Facilitator Server
FACILITATOR_PORT=3000
NETWORK=solana:devnet

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Payer Keypair (JSON array format)
PAYER_PRIVATE_KEY=[123,45,67,...]

# Token Mint (set after deployment)
NEXT_PUBLIC_TOKEN_MINT=
```

### 4. Configure Kora

Ensure Kora is configured properly:

1. **kora/kora.toml**: Configure allowed tokens and programs
2. **kora/signers.toml**: Set up signer with `KORA_SIGNER_PRIVATE_KEY`

### 5. Fund Accounts

**Kora Signer** (needs SOL for fees):
```bash
solana airdrop 2 <KORA_SIGNER_ADDRESS> --url devnet
```

**Payer** (needs USDC or your custom token):
- Get Devnet USDC from [Circle Faucet](https://faucet.circle.com/)
- Or deploy your custom token first

## Running

### Start Kora RPC Server

In Terminal 1:
```bash
yarn kora:start
```

Or manually:
```bash
cd ../kora
kora --config kora.toml --rpc-url https://api.devnet.solana.com rpc start --signers-config signers.toml
```

### Start Facilitator Server

In Terminal 2:
```bash
yarn facilitator
```

The server will start on `http://localhost:3000`

## Deploy Custom SPL Token

Deploy your custom token (similar to Inco token):

```bash
yarn deploy-token
```

This will:
1. Generate a mint keypair
2. Create and initialize the token
3. Mint initial supply
4. Save mint address to `.env.local`

## API Endpoints

### `GET /health`
Health check endpoint.

### `GET /verify`
Documentation for verify endpoint.

### `POST /verify`
Verify a payment transaction without broadcasting.

**Request:**
```json
{
  "paymentPayload": {
    "payload": {
      "transaction": "<base64_encoded_transaction>"
    }
  },
  "paymentRequirements": {
    "network": "solana:devnet",
    "price": "$0.0001"
  }
}
```

**Response:**
```json
{
  "isValid": true
}
```

### `POST /settle`
Settle a payment by broadcasting to Solana.

**Request:** Same as `/verify`

**Response:**
```json
{
  "transaction": "<transaction_signature>",
  "success": true,
  "network": "solana:devnet"
}
```

### `GET /supported`
Get supported payment schemes.

**Response:**
```json
{
  "kinds": [{
    "x402Version": 2,
    "scheme": "exact",
    "network": "solana:devnet",
    "extra": {
      "feePayer": "<kora_signer_address>"
    }
  }]
}
```

## Integration

### With Protected API

Use the facilitator URL in your x402-protected API:

```typescript
import { paymentMiddleware } from '@x402/express';

app.use(
  paymentMiddleware(
    PAYMENT_RECEIVER_ADDRESS,
    {
      "GET /protected": {
        price: "$0.0001",
        network: "solana:devnet",
      },
    },
    {
      url: "http://localhost:3000", // Facilitator URL
    }
  )
);
```

### With Client

Use x402 fetch wrapper:

```typescript
import { wrapFetchWithPayment } from '@x402/client';
import { createSigner } from '@x402/svm';

const payer = await createSigner('devnet', PAYER_PRIVATE_KEY);
const fetchWithPayment = wrapFetchWithPayment(fetch, payer);

const response = await fetchWithPayment('http://localhost:4021/protected');
```

## Troubleshooting

### Kora Connection Issues
- Ensure Kora RPC server is running on port 8080
- Check `KORA_API_KEY` matches `kora.toml` configuration
- Verify network connectivity

### Transaction Failures
- Check Kora signer has sufficient SOL for fees
- Verify allowed tokens/programs in `kora.toml`
- Check transaction size and compute units

### Token Deployment Issues
- Ensure payer has sufficient SOL (at least 0.1 SOL)
- Verify RPC endpoint is accessible
- Check keypair format in environment variables

## Next Steps

1. **Deploy Token**: Run `yarn deploy-token` to create your custom SPL token
2. **Configure Kora**: Add your token mint to `allowed_tokens` in `kora.toml`
3. **Test Flow**: Use the client demo to test end-to-end payment flow
4. **Production**: Deploy facilitator to cloud (Vercel, Railway, etc.)
