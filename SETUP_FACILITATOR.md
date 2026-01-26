# Facilitator Setup Guide

This guide will help you set up the x402 facilitator with Kora integration.

## Prerequisites

1. **Kora Repository**: Already cloned in `../kora/`
2. **Node.js**: LTS version (18+)
3. **Solana CLI**: Installed and configured
4. **Rust**: For building Kora (if needed)

## Step 1: Build Kora SDK

The facilitator uses `@solana/kora` which needs to be built from the Kora repository:

```bash
# Navigate to Kora SDK directory
cd ../kora/sdks/ts

# Install dependencies
pnpm install

# Build the SDK
pnpm build
```

This will create the `dist/` folder with the compiled TypeScript SDK.

## Step 2: Install Project Dependencies

```bash
# From my-app directory
yarn install
```

If you get errors about `@solana/kora`, you may need to link it manually:

```bash
# Option 1: Use file reference (already in package.json)
yarn install

# Option 2: If that doesn't work, use yarn link
cd ../kora/sdks/ts
yarn link

cd ../../../my-app
yarn link "@solana/kora"
```

## Step 3: Install x402 Packages

The x402 packages need to be installed from npm:

```bash
yarn add @x402/core@^2.0.0 @x402/svm@^2.0.0
```

## Step 4: Configure Kora

### 4.1 Configure kora.toml

Edit `../kora/kora.toml`:

```toml
[kora.auth]
api_key = "kora_facilitator_api_key_example"

[validation.allowed_tokens]
allowed_tokens = [
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", # USDC devnet
    # Add your custom token mint here after deployment
]

[validation.allowed_programs]
allowed_programs = [
    "11111111111111111111111111111111",             # System Program
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",  # Token Program
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", # Associated Token Program
    "ComputeBudget111111111111111111111111111111",  # Compute Budget Program
]
```

### 4.2 Configure signers.toml

Edit `../kora/signers.toml`:

```toml
[[signers]]
name = "main_signer"
type = "memory"
private_key_env = "KORA_SIGNER_PRIVATE_KEY"
weight = 1
```

## Step 5: Set Up Environment Variables

Create `.env.local` in `my-app/`:

```bash
cp app/facilator/.env.example .env.local
```

Edit `.env.local`:

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

# Payer Keypair (generate with: solana-keygen new)
# Export as JSON array: solana-keygen pubkey <keypair-file> --outfile /dev/stdout
PAYER_PRIVATE_KEY=[123,45,67,...]

# Kora Signer Keypair (same format)
KORA_SIGNER_PRIVATE_KEY=[123,45,67,...]

# Token Mint (will be set after deployment)
NEXT_PUBLIC_TOKEN_MINT=

# Facilitator URL
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3000
```

### Generate Keypairs

```bash
# Generate payer keypair
solana-keygen new --outfile payer-keypair.json

# Generate Kora signer keypair
solana-keygen new --outfile kora-signer-keypair.json

# Convert to JSON array format for .env.local
node -e "const fs=require('fs'); const kp=JSON.parse(fs.readFileSync('payer-keypair.json')); console.log(JSON.stringify(Array.from(kp)));"
```

## Step 6: Fund Accounts

### Fund Kora Signer (needs SOL for fees)

```bash
# Get the signer address
solana-keygen pubkey kora-signer-keypair.json

# Airdrop SOL
solana airdrop 2 <SIGNER_ADDRESS> --url devnet
```

### Fund Payer (needs USDC or custom token)

For USDC:
- Visit [Circle Faucet](https://faucet.circle.com/)
- Select "Solana Devnet"
- Enter your payer address

For custom token:
- Deploy token first (see Step 7)
- Tokens will be minted to payer

## Step 7: Deploy Custom SPL Token

Deploy your custom token (similar to Inco token):

```bash
yarn deploy-token
```

This will:
1. Create a new mint keypair
2. Initialize the token
3. Mint initial supply (1M tokens)
4. Save mint address to `.env.local`

**Important**: After deployment, add the mint address to `kora.toml`:

```toml
allowed_tokens = [
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", # USDC devnet
    "<YOUR_TOKEN_MINT_ADDRESS>", # Your custom token
]
```

## Step 8: Run the System

You'll need **3 terminal windows**:

### Terminal 1: Start Kora RPC Server

```bash
cd ../kora
kora --config kora.toml --rpc-url https://api.devnet.solana.com rpc start --signers-config signers.toml
```

Or use the npm script:

```bash
# From my-app directory
yarn kora:start
```

### Terminal 2: Start Facilitator Server

```bash
# From my-app directory
yarn facilitator
```

You should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FACILITATOR SERVER STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server listening at http://localhost:3000
Kora RPC URL: http://localhost:8080/
Network: solana:devnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Terminal 3: Test the Facilitator

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test supported endpoint
curl http://localhost:3000/supported
```

## Troubleshooting

### Issue: `@solana/kora` not found

**Solution:**
1. Ensure you built the Kora SDK: `cd ../kora/sdks/ts && pnpm build`
2. Check the file path in `package.json` is correct
3. Try `yarn install --force`

### Issue: Kora connection refused

**Solution:**
1. Ensure Kora RPC server is running on port 8080
2. Check `KORA_RPC_URL` in `.env.local`
3. Verify `KORA_API_KEY` matches `kora.toml`

### Issue: Transaction failures

**Solution:**
1. Check Kora signer has SOL: `solana balance <SIGNER_ADDRESS> --url devnet`
2. Verify token mint is in `allowed_tokens` in `kora.toml`
3. Check transaction size and compute units

### Issue: Token deployment fails

**Solution:**
1. Ensure payer has at least 0.1 SOL
2. Check RPC endpoint is accessible
3. Verify keypair format in `PAYER_PRIVATE_KEY` (must be JSON array)

## Next Steps

1. ✅ Facilitator is running
2. ✅ Custom token is deployed
3. 🔄 Integrate with protected API (see `app/facilator/README.md`)
4. 🔄 Test end-to-end payment flow
5. 🔄 Deploy to production

## Additional Resources

- [Kora Documentation](https://github.com/solana-foundation/kora)
- [x402 Protocol Docs](https://x402.dev)
- [Solana SPL Token Guide](https://spl.solana.com/token)
