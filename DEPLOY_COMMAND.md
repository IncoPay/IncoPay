# How to Deploy IncoToken Program

## Quick Command (From my-app/ directory)

```bash
# Make sure you're in my-app/ directory
cd /Users/ayush/Desktop/inco-solana/my-app

# Run the deployment script
yarn deploy-inco-token
```

## Manual Command (From lightning-rod-solana/ directory)

If you're already in `lightning-rod-solana/`, just run:

```bash
# Deploy program
solana program deploy \
  --program-id target/deploy/inco_token-keypair.json \
  target/deploy/inco_token.so \
  --url devnet \
  --max-sign-attempts 1000

# Upload IDL
anchor idl init \
  --filepath target/idl/inco_token.json \
  9Cir3JKBcQ1mzasrQNKWMiGVZvYu3dxvfkGeQ6mohWWi \
  --provider.cluster devnet

# Copy IDL to public folder
cp target/idl/inco_token.json ../public/idl/inco_token.json
```

## Note

The `yarn deploy-inco-token` script must be run from the `my-app/` directory, not from `lightning-rod-solana/`.
