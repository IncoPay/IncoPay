# Terminal Steps

Run these in **separate terminals** from `my-app`.

## Quick Start

```bash
# Terminal 1 - Kora
yarn kora:start

# Terminal 2 - Facilitator  
yarn facilitator

# Terminal 3 - Next.js
yarn dev
```

Then go to **http://localhost:3000/started** (Get Started)

## After IncoToken Changes

```bash
cd lightning-rod-solana
anchor build
cd ..
yarn deploy-inco-token
```

Restart facilitator after deploy.

## After Kora Changes

```bash
cd ../kora
cargo build --release
cd ../my-app
# Stop Kora (Ctrl+C) then:
yarn kora:start
```

## Summary

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `yarn kora:start` | Fee payer (port 8080) |
| 2 | `yarn facilitator` | API (port 3001) |
| 3 | `yarn dev` | Frontend (port 3000) |
