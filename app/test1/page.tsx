'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import WalletButton from '../components/WalletButton';
import Link from 'next/link';
// Note: x402 client integration will be added when dependencies are installed
// import { wrapFetchWithPayment } from '@x402/client';
// import { createSigner } from '@x402/svm';

export default function TestFacilitatorPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [amount, setAmount] = useState<string>('0.0001');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const FACILITATOR_URL = 'https://inco-facilitator-production.up.railway.app';
  const TEST_API_URL = `${FACILITATOR_URL}/test-payment`;

  const handleTestPayment = async () => {
    if (!publicKey || !signTransaction) {
      setStatus('❌ Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setStatus('🔄 Sending test payment request to facilitator...');

      // Simple test payment - in production, this would use x402 client
      // For now, we'll just test the facilitator endpoint directly
      const response = await fetch(TEST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          recipient: publicKey.toBase58(),
          payer: publicKey.toBase58(),
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        setPaymentResult(data);
        setStatus('✅ Test payment successful! (This is a mock endpoint)');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus(`❌ Payment failed with status: ${response.status}`);
        setPaymentResult(errorData);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setStatus(`❌ Error: ${error.message}\n\nMake sure facilitator is running: yarn facilitator`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestFacilitatorHealth = async () => {
    try {
      setLoading(true);
      setStatus('🔄 Checking facilitator health...');
      
      const response = await fetch(`${FACILITATOR_URL}/health`);
      const data = await response.json();
      
      setStatus(`✅ Facilitator is ${data.status}`);
      setPaymentResult(data);
    } catch (error: any) {
      setStatus(`❌ Cannot reach facilitator: ${error.message}`);
      setPaymentResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSupported = async () => {
    try {
      setLoading(true);
      setStatus('🔄 Fetching supported payment schemes...');
      
      const response = await fetch(`${FACILITATOR_URL}/supported`);
      const data = await response.json();
      
      setStatus('✅ Supported payment schemes retrieved');
      setPaymentResult(data);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setPaymentResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2463EB] flex items-center justify-center">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </div>
          <Link href="/" className="text-lg sm:text-2xl font-bold text-white font-serif hover:opacity-80 transition-opacity">
            IncoPay
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <WalletButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-serif mb-4">
            Test Kora Facilitator
          </h1>
          <p className="text-zinc-400 text-lg mb-8">
            Test the x402 payment facilitator with Kora integration. This demonstrates gasless payments for API access.
          </p>

          {/* Facilitator Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Facilitator Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Facilitator URL:</span>
                <code className="text-[#2463EB] font-mono text-sm">{FACILITATOR_URL}</code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleTestFacilitatorHealth}
                  disabled={loading}
                  className="px-4 py-2 bg-[#2463EB] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
                >
                  Check Health
                </button>
                <button
                  onClick={handleTestSupported}
                  disabled={loading}
                  className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Get Supported
                </button>
              </div>
            </div>
          </div>

          {/* Payment Test */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Payment</h2>
            
            {!connected && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-yellow-200 text-sm">
                  ⚠️ Please connect your wallet to test payments
                </p>
              </div>
            )}

            {connected && publicKey && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <p className="text-green-200 text-sm">
                  ✅ Connected: <code className="font-mono text-xs">{publicKey.toBase58().substring(0, 20)}...</code>
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Payment Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2463EB]"
                  placeholder="0.0001"
                />
              </div>

              <button
                onClick={handleTestPayment}
                disabled={loading || !connected}
                className="w-full px-6 py-3 bg-[#2463EB] text-white rounded-lg font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing Payment...' : 'Test Payment via Facilitator'}
              </button>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-2">Status</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{status}</p>
            </div>
          )}

          {/* Result */}
          {paymentResult && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-2">Response</h3>
              <pre className="text-xs text-zinc-300 overflow-auto bg-black/50 p-4 rounded-lg">
                {JSON.stringify(paymentResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Info */}
          <div className="bg-[#2463EB]/10 border border-[#2463EB]/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">How It Works</h3>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>• <strong>Facilitator</strong>: Acts as a bridge between x402 protocol and Kora</li>
              <li>• <strong>Kora</strong>: Provides gasless transaction signing and fee payment</li>
              <li>• <strong>x402</strong>: HTTP 402 Payment Required protocol for API monetization</li>
              <li>• <strong>Payment Flow</strong>: Client → Facilitator → Kora → Solana</li>
            </ul>
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-200">
                ⚠️ <strong>Note:</strong> Facilitator runs on port 3001 (Next.js uses 3000). Run <code className="bg-black/50 px-1 rounded">yarn facilitator</code> in a separate terminal. For &quot;Get Supported&quot;, Kora RPC must also be running (<code className="bg-black/50 px-1 rounded">yarn kora:start</code>).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
