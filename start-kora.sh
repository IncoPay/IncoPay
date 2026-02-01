#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Extract KORA_PRIVATE_KEY from .env.local
KORA_PRIVATE_KEY=$(grep "^KORA_PRIVATE_KEY=" .env.local | cut -d '=' -f2- | tr -d ' ')

if [ -z "$KORA_PRIVATE_KEY" ]; then
    echo "❌ Error: KORA_PRIVATE_KEY not found in .env.local"
    exit 1
fi

# Export the variable
export KORA_PRIVATE_KEY

# Start Kora (prefer locally built release binary so sig_verify fix is used)
cd ../kora
if [ -x "./target/release/kora" ]; then
  exec ./target/release/kora --config kora.toml --rpc-url https://api.devnet.solana.com rpc start --signers-config signers.toml
else
  exec kora --config kora.toml --rpc-url https://api.devnet.solana.com rpc start --signers-config signers.toml
fi
