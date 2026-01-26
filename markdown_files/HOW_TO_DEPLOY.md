# How to Deploy IncoToken Program

## Quick Summary

The program deployment failed with "154 write transactions failed" because the program is too large. Use `solana program deploy` with `--max-sign-attempts` instead of `anchor deploy`.

## Step-by-Step Deployment

### Step 1: Navigate to Program Directory

```bash
cd lightning-rod-solana
```

### Step 2: Deploy Using solana CLI (Recommended)

```bash
solana program deploy \
  --program-id target/deploy/inco_token-keypair.json \
  target/deploy/inco_token.so \
  --url devnet \
  --max-sign-attempts 1000
```

**What this does:**
- `--max-sign-attempts 1000` allows splitting the deployment across multiple transactions
- This fixes the "154 write transactions failed" error

### Step 3: Upload IDL (After Successful Deployment)

```bash
anchor idl init \
  --filepath target/idl/inco_token.json \
  9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi \
  --provider.cluster devnet
```

### Step 4: Copy IDL to Public Folder (Backup)

```bash
cp target/idl/inco_token.json ../public/idl/inco_token.json
```

This allows the test page to load IDL locally if on-chain IDL isn't available.

## Alternative: Use npm Scripts

From `my-app/` directory:

```bash
# Deploy program and copy IDL
yarn deploy-inco-token

# Or just copy IDL (if program already deployed)
yarn copy-idl
```

## Prerequisites

1. **Wallet has SOL:**
   ```bash
   solana balance --url devnet
   # If low, airdrop:
   solana airdrop 5 --url devnet
   ```

2. **Program is built:**
   ```bash
   cd lightning-rod-solana
   anchor build
   ```

3. **You're on devnet:**
   ```bash
   solana config set --url devnet
   ```

## Verify Deployment

After deployment, verify it worked:

```bash
solana program show 9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi --url devnet
```

You should see program details if deployment succeeded.

## Complete Command Sequence

```bash
# 1. Navigate to program directory
cd lightning-rod-solana

# 2. Ensure you have SOL
solana balance --url devnet
# If needed: solana airdrop 5 --url devnet

# 3. Deploy program
solana program deploy \
  --program-id target/deploy/inco_token-keypair.json \
  target/deploy/inco_token.so \
  --url devnet \
  --max-sign-attempts 1000

# 4. Upload IDL
anchor idl init \
  --filepath target/idl/inco_token.json \
  9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi \
  --provider.cluster devnet

# 5. Copy IDL as backup
cp target/idl/inco_token.json ../public/idl/inco_token.json

# 6. Return to my-app
cd ../my-app
```

## Troubleshooting

### "Insufficient funds"
- Airdrop more SOL: `solana airdrop 5 --url devnet`

### "Program already deployed"
- That's fine! Just upload IDL and copy it to public folder

### "File not found"
- Make sure you ran `anchor build` first
- Check that `target/deploy/inco_token.so` exists

### Still getting "write transactions failed"
- Try increasing `--max-sign-attempts` to 2000
- Or use a different RPC endpoint

## Quick Reference

**Program ID:** `9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi`

**Key Files:**
- Program binary: `lightning-rod-solana/target/deploy/inco_token.so`
- Program keypair: `lightning-rod-solana/target/deploy/inco_token-keypair.json`
- IDL: `lightning-rod-solana/target/idl/inco_token.json`
- Public IDL (backup): `my-app/public/idl/inco_token.json`
