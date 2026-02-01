# Facilitator Server

X402 payment facilitator for confidential token transfers.

## Run

```bash
yarn facilitator
```

Listens on `http://localhost:3001`

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/getAmount` | POST | Get encrypted ciphertext for amount |
| `/verify` | POST | Verify message signature |
| `/settle` | POST | Build tx, get user signature, submit via Kora |
| `/supported` | GET | Supported payment schemes |

## Requirements

- **Kora** running on port 8080 (`yarn kora:start`)
- **KORA_PRIVATE_KEY** in `.env.local`
