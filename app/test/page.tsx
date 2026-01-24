"use client";

import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Connection, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { encryptAmount } from "./utils/confidentialTransfer";
import WalletButton from "../components/WalletButton";
import Link from "next/link";

export default function TestPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signMessage, connected } = useWallet();
  const [amount, setAmount] = useState<string>("1");
  const [recipient, setRecipient] = useState<string>("");
  const [sourceAccount, setSourceAccount] = useState<string>("");
  const [destAccount, setDestAccount] = useState<string>("");
  const [encryptedAmount, setEncryptedAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [txSignature, setTxSignature] = useState<string>("");
  const [sourceBalance, setSourceBalance] = useState<string>("");
  const [destBalance, setDestBalance] = useState<string>("");

  // Initialize program
  const [program, setProgram] = useState<anchor.Program | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      initializeProgram();
      // Auto-populate source account with wallet address
      // Note: In production, you'd derive the associated token account
      setSourceAccount(publicKey.toBase58());
    } else {
      setSourceAccount("");
    }
  }, [connected, publicKey]);

  const initializeProgram = async () => {
    try {
      // For now, we'll use a simplified approach
      // In production, you'd load the IDL from the target/types folder
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: publicKey!,
          signTransaction: signTransaction!,
          signAllTransactions: async (txs: Transaction[]) => {
            const signed = [];
            for (const tx of txs) {
              signed.push(await signTransaction!(tx));
            }
            return signed;
          },
        } as any,
        { commitment: "confirmed" }
      );

      anchor.setProvider(provider);

      // Try to load program from workspace or use a minimal setup
      // Note: This requires the IDL to be available
      // For now, we'll create a placeholder that will work with manual instruction building
      setProgram(provider as any);
      setStatus("Program initialized. Note: Full functionality requires IDL.");
    } catch (error: any) {
      setStatus(`Error initializing program: ${error.message}`);
    }
  };

  const handleEncrypt = async () => {
    if (!amount || isNaN(Number(amount))) {
      setStatus("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setStatus("Encrypting amount...");

      const encrypted = await encryptAmount(Number(amount), 9);
      setEncryptedAmount(encrypted);
      setStatus(`Amount encrypted successfully! Encrypted: ${encrypted.substring(0, 30)}...`);
    } catch (error: any) {
      setStatus(`Encryption error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!publicKey || !signTransaction) {
      setStatus("Please connect your wallet");
      return;
    }

    if (!encryptedAmount) {
      setStatus("Please encrypt the amount first");
      return;
    }

    if (!sourceAccount || !destAccount) {
      setStatus("Please enter source and destination account addresses");
      return;
    }

    let sourcePubkey: PublicKey;
    let destPubkey: PublicKey;

    try {
      sourcePubkey = new PublicKey(sourceAccount);
      destPubkey = new PublicKey(destAccount);
    } catch (error: any) {
      setStatus(`Invalid address: ${error.message}`);
      return;
    }

    try {
      setLoading(true);
      setStatus("Preparing confidential transfer...\n\nThis uses Inco Confidential Tokens (not SOL).\nThe transfer amount will be encrypted on-chain.");

      const encrypted = encryptedAmount || await encryptAmount(Number(amount), 9);
      const transferAmount = BigInt(Math.floor(Number(amount) * 1e9));

      // Import utility functions
      const { 
        INCO_LIGHTNING_PROGRAM_ID, 
        INCO_TOKEN_PROGRAM_ID,
        getAllowancePda, 
        simulateTransferAndGetHandles,
        hexToBuffer 
      } = await import("./utils/confidentialTransfer");

      // Create provider first
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: publicKey,
          signTransaction: signTransaction!,
          signAllTransactions: async (txs: Transaction[]) => {
            const signed = [];
            for (const tx of txs) {
              signed.push(await signTransaction!(tx));
            }
            return signed;
          },
        } as any,
        { commitment: "confirmed" }
      );
      anchor.setProvider(provider);

      // Load the program by fetching IDL (workspace is not available in browser)
      let program: any = null;
      try {
        // Try to fetch IDL from on-chain program
        // Note: fetchIdl signature may vary by Anchor version
        const programId: PublicKey = INCO_TOKEN_PROGRAM_ID;
        const idl: anchor.Idl | null = await (anchor.Program as any).fetchIdl(programId, provider);
        
        if (!idl) {
          throw new Error("Could not fetch IDL from on-chain program. The program may not be deployed or IDL may not be available.");
        }
        
        // Create program with IDL (using any to bypass browser type issues)
        program = new (anchor.Program as any)(idl, programId, provider);
      } catch (idlError: any) {
        setStatus(`⚠️ Program IDL not found.\n\nTo enable transfers, please:\n1. cd lightning-rod-solana\n2. anchor build\n3. anchor deploy --provider.cluster devnet\n4. Ensure IDL is uploaded to the program\n\nError: ${idlError.message}`);
        setLoading(false);
        return;
      }

      if (!program) {
        setStatus("⚠️ Could not load IncoToken program. Please ensure the program is built and IDL is available.");
        setLoading(false);
        return;
      }

      setStatus("Simulating transaction to get balance handles...");

      // Step 1: Build transaction for simulation
      const txForSim = await program.methods
        .transfer(hexToBuffer(encrypted), 0)
        .accounts({
          source: sourcePubkey,
          destination: destPubkey,
          authority: publicKey,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .transaction();

      // Step 2: Simulate to get handles
      const { sourceHandle, destHandle } = await simulateTransferAndGetHandles(
        txForSim,
        connection,
        sourcePubkey,
        destPubkey,
        publicKey
      );

      if (!sourceHandle || !destHandle) {
        setStatus("❌ Failed to simulate transaction. Please check that:\n- Source account exists and has balance\n- Destination account exists\n- Accounts are valid IncoToken accounts");
        setLoading(false);
        return;
      }

      setStatus("Deriving allowance PDAs for decryption access...");

      // Step 3: Derive allowance PDAs
      const [sourceAllowancePda] = getAllowancePda(sourceHandle, publicKey);
      const [destAllowancePda] = getAllowancePda(destHandle, publicKey);

      setStatus("Building transfer transaction...\n\n⚠️ You will be asked to sign the transaction in your wallet.");

      // Step 4: Build actual transfer transaction
      const transferTx = await program.methods
        .transfer(hexToBuffer(encrypted), 0)
        .accounts({
          source: sourcePubkey,
          destination: destPubkey,
          authority: publicKey,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .remainingAccounts([
          { pubkey: sourceAllowancePda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: false, isWritable: false },
          { pubkey: destAllowancePda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: false, isWritable: false },
        ])
        .transaction();

      setStatus("Waiting for wallet signature...\n\nPlease approve the transaction in your wallet.");

      // Step 5: Execute transfer using .rpc() which will trigger wallet signature
      const signature = await program.methods
        .transfer(hexToBuffer(encrypted), 0)
        .accounts({
          source: sourcePubkey,
          destination: destPubkey,
          authority: publicKey,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .remainingAccounts([
          { pubkey: sourceAllowancePda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: false, isWritable: false },
          { pubkey: destAllowancePda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: false, isWritable: false },
        ])
        .rpc();

      setTxSignature(signature);
      setStatus(`✅ Transaction submitted!\n\nSignature: ${signature}\n\nWaiting for confirmation...`);

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      setStatus(`✅ Transfer successful!\n\nAmount: ${amount} Inco Confidential Tokens\nFrom: ${sourceAccount.substring(0, 8)}...\nTo: ${destAccount.substring(0, 8)}...\n\nTransaction: ${signature}\n\nThe transfer amount is encrypted on-chain and only visible to authorized parties.`);

    } catch (error: any) {
      if (error.message?.includes("User rejected")) {
        setStatus("❌ Transaction cancelled by user.");
      } else if (error.message?.includes("insufficient funds") || error.message?.includes("0x1")) {
        setStatus(`❌ Transfer failed: Insufficient balance or invalid account state.\n\nError: ${error.message}\n\nPlease ensure:\n- Source account has sufficient balance\n- Both accounts are initialized IncoToken accounts\n- You have the authority to transfer from the source account`);
      } else {
        setStatus(`❌ Transfer error: ${error.message}\n\n${error.stack || ""}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptBalance = async (accountPubkey: string, isSource: boolean) => {
    if (!publicKey || !signMessage) {
      setStatus("Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      setStatus("Decrypting balance...");

      // This is a placeholder - in production, you'd fetch the account and decrypt
      setStatus("Balance decryption requires account fetch and handle extraction. See test file for implementation.");

    } catch (error: any) {
      setStatus(`Decryption error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--button-bg)] flex items-center justify-center">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="12" cy="14" r="1.5" fill="white"/>
              <circle cx="9" cy="12" r="1.5" fill="white"/>
              <circle cx="15" cy="12" r="1.5" fill="white"/>
              <circle cx="10.5" cy="16" r="1.5" fill="white"/>
              <circle cx="13.5" cy="16" r="1.5" fill="white"/>
              <line x1="12" y1="14" x2="9" y2="12" stroke="white" strokeWidth="0.8" opacity="0.4"/>
              <line x1="12" y1="14" x2="15" y2="12" stroke="white" strokeWidth="0.8" opacity="0.4"/>
              <line x1="12" y1="14" x2="10.5" y2="16" stroke="white" strokeWidth="0.8" opacity="0.4"/>
              <line x1="12" y1="14" x2="13.5" y2="16" stroke="white" strokeWidth="0.8" opacity="0.4"/>
            </svg>
          </div>
          <Link href="/" className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-serif hover:opacity-80 transition-opacity">
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] font-serif mb-8">
            Confidential Transfer Test
          </h1>

          {!connected && (
            <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
              <p className="text-[var(--text-paragraph)] font-sans mb-2">
                Please connect your wallet to test confidential transfers.
              </p>
              <p className="text-sm text-[var(--text-paragraph)] font-sans">
                Once connected, your wallet address will be automatically used as the source account.
              </p>
            </div>
          )}

          {connected && publicKey && (
            <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-4 mb-6">
              <p className="text-sm text-[var(--text-paragraph)] font-sans mb-1">
                <span className="font-medium text-[var(--text-primary)]">Connected Wallet:</span>{" "}
                <span className="font-mono text-xs">{publicKey.toBase58()}</span>
              </p>
              <p className="text-xs text-[var(--text-paragraph)] font-sans">
                This address is automatically set as your source account.
              </p>
            </div>
          )}

          {/* Amount Input */}
          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-serif mb-4">
              Step 1: Enter Amount
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 font-sans">
                  Amount (tokens)
                </label>
                <input
                  type="number"
                  step="0.000000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-sans focus:outline-none focus:ring-2 focus:ring-[var(--button-bg)]"
                  placeholder="1.0"
                />
              </div>
              <button
                onClick={handleEncrypt}
                disabled={loading || !amount}
                className="w-full sm:w-auto px-6 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Encrypting..." : "Encrypt Amount"}
              </button>
              {encryptedAmount && (
                <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2 font-sans">Encrypted Amount:</p>
                  <p className="text-xs text-[var(--text-paragraph)] font-mono break-all font-sans">
                    {encryptedAmount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Inputs */}
          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-serif mb-4">
              Step 2: Enter Account Addresses
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 font-sans">
                  Source Account {connected && publicKey && "(auto-filled from wallet)"}
                </label>
                <input
                  type="text"
                  value={sourceAccount}
                  onChange={(e) => setSourceAccount(e.target.value)}
                  disabled={connected && publicKey ? true : false}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-sans focus:outline-none focus:ring-2 focus:ring-[var(--button-bg)] font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={connected && publicKey ? "Wallet address (auto-filled)" : "Enter source token account address or connect wallet"}
                />
                {connected && publicKey && (
                  <p className="mt-2 text-xs text-[var(--text-paragraph)] font-sans">
                    💡 Source account is set from your connected wallet. To use a different account, disconnect and enter manually.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 font-sans">
                  Destination Account (recipient token account)
                </label>
                <input
                  type="text"
                  value={destAccount}
                  onChange={(e) => setDestAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-sans focus:outline-none focus:ring-2 focus:ring-[var(--button-bg)] font-mono text-sm"
                  placeholder="Enter destination token account address"
                />
              </div>
            </div>
          </div>

          {/* Transfer Button */}
          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-serif mb-4">
              Step 3: Execute Transfer
            </h2>
            <button
              onClick={handleTransfer}
              disabled={loading || !encryptedAmount || !sourceAccount || !destAccount || !connected}
              className="w-full px-6 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Execute Confidential Transfer"}
            </button>
          </div>

          {/* Status */}
          {status && (
            <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] font-serif mb-2">Status</h3>
              <p className="text-sm text-[var(--text-paragraph)] whitespace-pre-wrap font-sans">{status}</p>
              {txSignature && (
                <a
                  href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[var(--button-bg)] hover:underline text-sm font-sans"
                >
                  View Transaction on Solscan
                </a>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] font-serif mb-3">How It Works</h3>
            <div className="mb-4 p-3 bg-[var(--bg-box)] rounded-lg border border-[var(--border-color)]">
              <p className="text-sm font-medium text-[var(--text-primary)] font-sans mb-1">
                🔒 This uses <strong>Inco Confidential Tokens</strong> (not SOL)
              </p>
              <p className="text-xs text-[var(--text-paragraph)] font-sans">
                These are custom tokens with encrypted balances. Transfer amounts are encrypted on-chain using Inco Lightning encryption.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--text-paragraph)] font-sans">
              <li>• Enter the amount you want to transfer (in Inco Confidential Tokens)</li>
              <li>• Click "Encrypt Amount" to encrypt the value client-side</li>
              <li>• Source account is auto-filled from your connected wallet</li>
              <li>• Enter destination token account address</li>
              <li>• Execute the transfer - you'll be asked to sign in your wallet</li>
              <li>• The amount remains encrypted on-chain - only authorized parties can decrypt</li>
            </ul>
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 font-sans mb-1">
                ⚠️ Setup Required
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-sans">
                To enable full transfer functionality, build the IncoToken program:
              </p>
              <code className="block mt-2 text-xs bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 rounded font-mono">
                cd lightning-rod-solana && anchor build
              </code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
