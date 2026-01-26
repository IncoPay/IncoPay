# Private x402 Demo Guide - Confidential SPL Token on Solana

## Overview

This guide explains how to build a demo for **IncoPay** - a confidential payment system using the x402 HTTP-402 protocol with confidential SPL tokens on Solana, powered by Inco Network.

## What is x402?

x402 is an HTTP extension that enables **micropayments for content access**. When a client requests protected content, the server responds with `402 Payment Required`, prompting the client to pay before accessing the content.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Server  │      │ Facilitator │
│  (IncoPay)  │      │  (Protected) │      │  (Payment)  │
└─────────────┘      └──────────────┘      └─────────────┘
      │                     │                      │
      │                     │                      │
      └─────────────────────┴──────────────────────┘
                    Solana Blockchain
              (Confidential SPL Token)
```

### Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Frontend (IncoPay)** | User interface for payment | Next.js (my-app) |
| **Protected API** | Serves premium content | Express/Next.js API |
| **Facilitator** | Handles payment verification & settlement | Solana Program + API |
| **Confidential SPL Token** | Payment token (encrypted balances) | Inco Lightning + SPL Token |
| **Inco Lightning** | Confidential computing layer | Inco Network SDK |

## Demo Flow

### Step 1: User Requests Premium Content
```
Client → GET /api/premium-content
Server → 402 Payment Required
```

**Response Headers:**
```
HTTP/1.1 402 Payment Required
X-Payment-Token: <SPL_TOKEN_MINT_ADDRESS>
X-Payment-Amount: 1000000  (1 USDC in smallest unit)
X-Payment-Facilitator: https://facilitator.inco.org
X-Payment-Network: solana-devnet
```

### Step 2: Client Initiates Payment
1. User clicks "Pay" button in IncoPay UI
2. Frontend encrypts payment amount using Inco SDK
3. Creates Solana transaction with confidential SPL token transfer
4. Submits transaction to facilitator for verification

### Step 3: Facilitator Verification
```
Client → POST /facilitator/verify
Body: {
  transaction: <signed_tx>,
  encrypted_amount: <euint128_handle>,
  proof: <decryption_proof>
}
Facilitator → { verified: true, payment_id: "..." }
```

### Step 4: Payment Settlement
```
Client → POST /facilitator/settle
Body: { payment_id: "..." }
Facilitator → { settled: true, receipt: "..." }
```

### Step 5: Content Access
```
Client → GET /api/premium-content
Headers: { X-Payment-Proof: <receipt> }
Server → 200 OK + Premium Content
```

## Facilitator URL Configuration

### Option 1: Use Existing Solana Facilitator (Recommended for Demo)

**Yes, you can use an existing facilitator**, but ensure it supports:
- Custom SPL tokens (not just USDC)
- Confidential token transfers
- Inco Lightning integration

**Recommended Facilitators:**
- **Rapid402**: Production-ready facilitator with SDK
  - URL: `https://api.rapid402.com`
  - Supports custom SPL tokens
  - GitHub: https://github.com/rapid402/rapid402-sdk

- **Solana x402 Reference**: Official Solana x402 implementation
  - Can be extended for confidential tokens
  - Reference: https://solana.com/developers/guides/getstarted/build-a-x402-facilitator

### Option 2: Deploy Your Own Facilitator

If existing facilitators don't support confidential SPL tokens, deploy your own:

**Minimal Facilitator Setup:**
```typescript
// facilitator/src/index.ts
import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { verifyPayment, settlePayment } from './payment-handler';

const app = express();
app.use(express.json());

// Verify payment transaction
app.post('/verify', async (req, res) => {
  const { transaction, encrypted_amount } = req.body;
  const verified = await verifyPayment(transaction, encrypted_amount);
  res.json({ verified, payment_id: generatePaymentId() });
});

// Settle payment
app.post('/settle', async (req, res) => {
  const { payment_id } = req.body;
  const receipt = await settlePayment(payment_id);
  res.json({ settled: true, receipt });
});

// Supported tokens
app.get('/supported', (req, res) => {
  res.json({
    tokens: [process.env.CONFIDENTIAL_TOKEN_MINT],
    network: 'devnet'
  });
});
```

**Environment Variables:**
```env
FACILITATOR_URL=http://localhost:3001
CONFIDENTIAL_TOKEN_MINT=<your_token_mint_address>
SOLANA_RPC_URL=https://api.devnet.solana.com
INCO_FACILITATOR_URL=https://facilitator.inco.org  # Inco's facilitator
```

## Integration with IncoPay

### 1. Update `/started` Page

The payment box should:
- Display "402 Premium Content" (already done ✅)
- Show price in confidential SPL token
- Handle payment flow when "Pay" button is clicked

**File: `my-app/app/started/page.tsx`**
```typescript
// Add payment handler
const handlePayment = async () => {
  // 1. Request content (expect 402)
  const response = await fetch('/api/premium-content');
  
  if (response.status === 402) {
    // 2. Extract payment requirements
    const tokenMint = response.headers.get('X-Payment-Token');
    const amount = response.headers.get('X-Payment-Amount');
    const facilitator = response.headers.get('X-Payment-Facilitator');
    
    // 3. Encrypt payment amount
    const encryptedAmount = await encryptValue(BigInt(amount));
    
    // 4. Create confidential SPL token transfer
    const tx = await createConfidentialTokenTransfer({
      from: wallet.publicKey,
      to: paymentAddress,
      amount: encryptedAmount,
      tokenMint: new PublicKey(tokenMint)
    });
    
    // 5. Submit to facilitator
    const verifyResponse = await fetch(`${facilitator}/verify`, {
      method: 'POST',
      body: JSON.stringify({ transaction: tx, encrypted_amount: encryptedAmount })
    });
    
    // 6. Settle payment
    const { payment_id } = await verifyResponse.json();
    await fetch(`${facilitator}/settle`, {
      method: 'POST',
      body: JSON.stringify({ payment_id })
    });
    
    // 7. Retry content request with proof
    const contentResponse = await fetch('/api/premium-content', {
      headers: { 'X-Payment-Proof': payment_id }
    });
    
    // 8. Display content
    const content = await contentResponse.json();
    setPremiumContent(content);
  }
};
```

### 2. Create Protected API Endpoint

**File: `my-app/app/api/premium-content/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentProof } from '@/lib/payment-verification';

export async function GET(request: NextRequest) {
  const paymentProof = request.headers.get('X-Payment-Proof');
  
  if (!paymentProof) {
    return NextResponse.json(
      { error: 'Payment required' },
      {
        status: 402,
        headers: {
          'X-Payment-Token': process.env.CONFIDENTIAL_TOKEN_MINT!,
          'X-Payment-Amount': '1000000', // 1 token
          'X-Payment-Facilitator': process.env.FACILITATOR_URL!,
          'X-Payment-Network': 'devnet'
        }
      }
    );
  }
  
  // Verify payment proof
  const isValid = await verifyPaymentProof(paymentProof);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid payment' }, { status: 403 });
  }
  
  // Return premium content
  return NextResponse.json({
    content: "This is your exclusive premium content!",
    accessGranted: true
  });
}
```

### 3. Confidential SPL Token Setup

**Using Inco Lightning for Confidential Tokens:**

```typescript
// lib/confidential-token.ts
import { encryptValue } from '@inco/solana-sdk/encryption';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

export async function createConfidentialTokenTransfer({
  from,
  to,
  amount,
  tokenMint
}: {
  from: PublicKey;
  to: PublicKey;
  amount: bigint;
  tokenMint: PublicKey;
}) {
  // 1. Encrypt amount
  const encryptedAmount = await encryptValue(amount);
  
  // 2. Get token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(tokenMint, from);
  const toTokenAccount = await getAssociatedTokenAddress(tokenMint, to);
  
  // 3. Create encrypted transfer instruction
  // This uses Inco Lightning's confidential SPL token program
  const transferIx = await createEncryptedTransferInstruction({
    from: fromTokenAccount,
    to: toTokenAccount,
    amount: encryptedAmount,
    owner: from
  });
  
  return transferIx;
}
```

## Minimal Roadmap (Least Steps)

### Phase 1: Setup (Week 1)
- [ ] **Day 1-2**: Set up facilitator URL (use Rapid402 or deploy minimal one)
- [ ] **Day 3**: Create confidential SPL token mint on devnet
- [ ] **Day 4**: Integrate Inco Lightning SDK for encryption
- [ ] **Day 5**: Test basic confidential token transfer

### Phase 2: Integration (Week 2)
- [ ] **Day 1-2**: Build protected API endpoint (`/api/premium-content`)
- [ ] **Day 3-4**: Implement payment flow in `/started` page
- [ ] **Day 5**: Connect frontend → facilitator → API flow

### Phase 3: Testing (Week 3)
- [ ] **Day 1-2**: Test full payment flow end-to-end
- [ ] **Day 3**: Test edge cases (insufficient balance, failed payments)
- [ ] **Day 4**: Add error handling and user feedback
- [ ] **Day 5**: UI/UX polish

### Phase 4: Deployment (Week 4)
- [ ] **Day 1-2**: Deploy facilitator to production (if custom)
- [ ] **Day 3**: Deploy API to Vercel/cloud
- [ ] **Day 4**: Deploy frontend
- [ ] **Day 5**: Mainnet testing (if ready)

## Environment Variables

Create `.env.local` in `my-app/`:

```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Facilitator
NEXT_PUBLIC_FACILITATOR_URL=https://api.rapid402.com
# OR for custom facilitator:
# NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3001

# Confidential SPL Token
NEXT_PUBLIC_CONFIDENTIAL_TOKEN_MINT=<your_token_mint_address>

# Inco Network
NEXT_PUBLIC_INCO_FACILITATOR_URL=https://facilitator.inco.org
```

## Key Dependencies

**Frontend (`my-app/package.json`):**
```json
{
  "dependencies": {
    "@inco/solana-sdk": "^0.0.2",
    "@solana/spl-token": "^0.4.8",
    "@solana/web3.js": "^1.95.4",
    "@solana/wallet-adapter-react": "^0.15.0"
  }
}
```

## Testing Checklist

- [ ] User can see "402 Premium Content" heading
- [ ] Payment box displays correct price (1 USDC/token)
- [ ] "Pay" button triggers payment flow
- [ ] Wallet connects successfully
- [ ] Confidential token transfer executes
- [ ] Facilitator verifies payment
- [ ] API returns premium content after payment
- [ ] Error handling works (insufficient balance, network errors)
- [ ] Payment proof is validated correctly

## Next Steps

1. **Choose Facilitator**: Decide between Rapid402 (easier) or custom deployment
2. **Mint Token**: Create confidential SPL token on devnet
3. **Build API**: Implement `/api/premium-content` endpoint
4. **Connect Flow**: Wire up payment button → facilitator → API
5. **Test**: Run end-to-end tests

## Resources

- [Inco Network Docs](https://docs.inco.org)
- [Solana x402 Guide](https://solana.com/developers/guides/getstarted/build-a-x402-facilitator)
- [Rapid402 SDK](https://github.com/rapid402/rapid402-sdk)
- [Inco Lightning Rust SDK](https://github.com/Inco-fhevm/inco-lightning-solana)

---

**Questions?** Check the raffle example in `raffle-example-solana/` for Inco Lightning integration patterns.
