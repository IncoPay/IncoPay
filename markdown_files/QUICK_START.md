# Quick Start Guide - Facilitator Setup

## Directory Structure

```
inco-solana/
├── kora/                    # Kora repository
│   └── sdks/ts/            # Kora TypeScript SDK
└── my-app/                  # ← Run ALL commands from here
    ├── app/
    │   └── facilator/
    ├── package.json
    └── .env.local           # (will be created)
```

## Step-by-Step Setup

### 1. Navigate to my-app directory

```bash
cd my-app
```

**All subsequent commands should be run from `my-app/` directory.**

### 2. Install Dependencies

```bash
# From my-app/ directory
yarn install
```

### 3. Build Kora SDK

```bash
# From my-app/ directory (the cd command handles navigation)
cd ../kora/sdks/ts && pnpm install && pnpm build

# Then return to my-app/
cd ../../../my-app
```

Or in separate steps:
```bash
# From my-app/ directory
cd ../kora/sdks/ts
pnpm install
pnpm build
cd ../../../my-app  # Return to my-app/
```

### 4. Set Up Environment

```bash
# From my-app/ directory
cp app/facilator/.env.example .env.local
```

Then edit `.env.local` with your keypairs:
```bash
# Edit the file (use your preferred editor)
nano .env.local
# or
code .env.local
```

### 5. Deploy Custom Token

```bash
# From my-app/ directory
yarn deploy-token
```

### 6. Start Services

You need **2 terminal windows**, both in `my-app/` directory:

**Terminal 1 - Start Kora:**
```bash
# From my-app/ directory
yarn kora:start
```

**Terminal 2 - Start Facilitator:**
```bash
# From my-app/ directory
yarn facilitator
```

## Command Reference (All from `my-app/`)

| Command | Directory | Notes |
|---------|----------|-------|
| `yarn install` | `my-app/` | Install project dependencies |
| `cd ../kora/sdks/ts && pnpm install && pnpm build` | `my-app/` | Builds Kora SDK (navigates automatically) |
| `cp app/facilator/.env.example .env.local` | `my-app/` | Creates env file |
| `yarn deploy-token` | `my-app/` | Deploys SPL token |
| `yarn kora:start` | `my-app/` | Starts Kora RPC server |
| `yarn facilitator` | `my-app/` | Starts facilitator server |

## Verification

After starting both services, test from `my-app/`:

```bash
# Test facilitator health
curl http://localhost:3000/health

# Test supported endpoints
curl http://localhost:3000/supported
```

## Troubleshooting

### "Command not found" errors

- Ensure you're in `my-app/` directory: `pwd` should show `.../inco-solana/my-app`
- Check if dependencies are installed: `ls node_modules`

### Kora SDK build errors

- Ensure you're running from `my-app/` when using the `cd` command
- Or navigate manually: `cd ../kora/sdks/ts` then run `pnpm install && pnpm build`

### Environment file not found

- Ensure you're in `my-app/` when running: `cp app/facilator/.env.example .env.local`
- The file should be created at `my-app/.env.local`

## Summary

**All commands run from: `my-app/` directory**

The only exception is the Kora SDK build, which uses `cd` to navigate automatically, but you still start the command from `my-app/`.
