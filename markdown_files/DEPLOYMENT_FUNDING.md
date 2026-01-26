# Fix: Insufficient Funds for Deployment

## Problem

The deployment failed because your wallet doesn't have enough SOL:
- **Required:** 4.28 SOL + 0.00306 SOL fee = **~4.28 SOL total**
- **Current:** ~2.72 SOL
- **Need:** ~1.5-2 SOL more

## Solution: Airdrop More SOL

```bash
# Check current balance
solana balance --url devnet

# Airdrop 5 SOL (safe amount)
solana airdrop 5 --url devnet

# Verify new balance
solana balance --url devnet
```

## Clean Up Failed Deployment Buffer (Optional)

If you want to recover lamports from the failed deployment buffer:

```bash
# Close the buffer account to recover lamports
solana program close Tx6dE3NBpPmLy9Wb5a8ZMrNs5c5ayJkLdruK6XxmftT --url devnet
```

**Note:** This is optional - you can just airdrop more SOL and try again.

## Retry Deployment

After airdropping, run the deployment again:

```bash
# From lightning-rod-solana/ directory
solana program deploy \
  --program-id target/deploy/inco_token-keypair.json \
  target/deploy/inco_token.so \
  --url devnet \
  --max-sign-attempts 1000
```

## Complete Sequence

```bash
# 1. Airdrop SOL
solana airdrop 5 --url devnet

# 2. Verify balance (should show ~7+ SOL)
solana balance --url devnet

# 3. Deploy program
solana program deploy \
  --program-id target/deploy/inco_token-keypair.json \
  target/deploy/inco_token.so \
  --url devnet \
  --max-sign-attempts 1000

# 4. Upload IDL (after successful deployment)
anchor idl init \
  --filepath target/idl/inco_token.json \
  9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi \
  --provider.cluster devnet

# 5. Copy IDL to public folder
cp target/idl/inco_token.json ../public/idl/inco_token.json
```
