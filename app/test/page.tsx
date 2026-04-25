"use client";

import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Connection, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { encryptAmount, getIncoAssociatedTokenAddress } from "./utils/confidentialTransfer";
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
      const mintStr = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
      if (mintStr) {
        try {
          const ata = getIncoAssociatedTokenAddress(publicKey, new PublicKey(mintStr));
          setSourceAccount(ata.toBase58());
        } catch {
          setSourceAccount(publicKey.toBase58());
        }
      } else {
        setSourceAccount(publicKey.toBase58());
      }
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

    const mintStr = "7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB";
    if (!mintStr) {
      setStatus("Missing NEXT_PUBLIC_TOKEN_MINT. Set it to your IncoToken mint address (IncoMint).");
      return;
    }

    let mint: PublicKey;
    let recipientWallet: PublicKey;
    try {
      mint = new PublicKey(mintStr);
      recipientWallet = new PublicKey(destAccount);
    } catch (error: any) {
      setStatus(`Invalid address: ${error.message}. Use recipient wallet address.`);
      return;
    }

    try {
      setLoading(true);
      setStatus("Preparing confidential transfer...\n\nThis uses Inco Confidential Tokens (not SOL).\nThe transfer amount will be encrypted on-chain.");

      const encrypted = encryptedAmount || await encryptAmount(Number(amount), 9);
      const transferAmount = BigInt(Math.floor(Number(amount) * 1e9));

      const {
        INCO_LIGHTNING_PROGRAM_ID,
        INCO_TOKEN_PROGRAM_ID,
        getIncoAssociatedTokenAddress: getATA,
        getAllowancePda,
        simulateTransferAndGetHandles,
        hexToBuffer,
      } = await import("./utils/confidentialTransfer");

      const sourcePubkey = getATA(publicKey!, mint, INCO_TOKEN_PROGRAM_ID);
      const destPubkey = getATA(recipientWallet, mint, INCO_TOKEN_PROGRAM_ID);

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

      // Load the program: use Program.at() (fetches IDL from chain) or fallback to local JSON
      let program: anchor.Program | null = null;
      const programId: PublicKey = INCO_TOKEN_PROGRAM_ID;

      try {
        // 1) Prefer on-chain IDL via Program.at() (correct Anchor API)
        program = await anchor.Program.at(programId, provider);
        setStatus("✓ Loaded program from on-chain IDL. Proceeding with transfer...");
      } catch {
        // 2) Fallback: load IDL from public folder (idl must have "address" field)
        try {
          const idlResponse = await fetch("/idl/inco_token.json");
          if (!idlResponse.ok) throw new Error("IDL file not found");
          const idl = await idlResponse.json();
          if (!idl.address) idl.address = programId.toBase58();
          program = new anchor.Program(idl, provider);
          setStatus("✓ Loaded program from local IDL. Proceeding with transfer...");
        } catch (fileErr: any) {
          setStatus(
            `⚠️ Program IDL not found.\n\n` +
              `1. Upload IDL: anchor idl init --filepath target/idl/inco_token.json ${programId.toBase58()} --provider.cluster devnet\n` +
              `2. Or copy: cp lightning-rod-solana/target/idl/inco_token.json my-app/public/idl/inco_token.json\n\n` +
              `Error: ${fileErr?.message ?? "Could not load IDL"}`
          );
          setLoading(false);
          return;
        }
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
        setStatus(
          "❌ Failed to simulate. Ensure:\n" +
            "• NEXT_PUBLIC_TOKEN_MINT is an IncoMint address (from IncoToken initialize_mint)\n" +
            "• Your IncoToken account exists (create via IncoToken create/create_idempotent for your wallet + mint)\n" +
            "• Recipient’s IncoToken account exists (same mint)\n" +
            "• Source has balance"
        );
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] font-serif">
              Token Deployment & Confidential Transfer
            </h1>
            <div className="flex gap-2">
              <Link href="/test2" className="px-4 py-2 bg-[#2463EB] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors text-sm">
                X402 Demo →
              </Link>
              <Link href="/test1" className="px-4 py-2 bg-[#2463EB]/80 text-white rounded-lg hover:bg-[#1d4ed8] transition-colors text-sm">
                Test Facilitator →
              </Link>
            </div>
          </div>

          {/* Token Deployment Section */}
          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-serif mb-4">
              Step 0: Deploy Custom Token
            </h2>
            <p className="text-[var(--text-paragraph)] font-sans mb-4">
              Deploy your custom SPL token (similar to Inco token) for confidential transfers.
            </p>
            <div className="space-y-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-sans mb-2">
                  ⚠️ Before deploying, ensure:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 font-sans space-y-1 ml-4">
                  <li>• You have PAYER_PRIVATE_KEY in .env.local (or it will be auto-generated)</li>
                  <li>• Payer address has SOL for deployment fees</li>
                  <li>• Run: <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">yarn deploy-token</code></li>
                </ul>
              </div>
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
                <p className="text-sm font-medium text-[var(--text-primary)] font-sans mb-2">
                  Token Mint (IncoMint) Address:
                </p>
                <code className="text-xs text-[var(--text-paragraph)] font-mono break-all">
                  {"7crFMbJN7hxVhUPNcRRxTGr9nD3TnvpZ8pNZepA19wuB"}
                </code>
                <p className="mt-2 text-xs text-[var(--text-paragraph)] font-sans">
                  For confidential transfers this must be an <strong>IncoMint</strong> from the IncoToken program (initialize_mint), not the SPL mint from deploy-token. Create IncoToken accounts (create/create_idempotent) for source and recipient.
                </p>
              </div>
            </div>
          </div>

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
                  Source (your IncoToken account)
                </label>
                <input
                  type="text"
                  value={sourceAccount}
                  onChange={(e) => setSourceAccount(e.target.value)}
                  disabled={connected && publicKey ? true : false}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-sans focus:outline-none focus:ring-2 focus:ring-[var(--button-bg)] font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="IncoToken account PDA (derived from wallet + mint)"
                />
                {connected && publicKey && (
                  <p className="mt-2 text-xs text-[var(--text-paragraph)] font-sans">
                    💡 Derived from your wallet + mint. Both source and recipient IncoToken accounts must exist (create via IncoToken program if needed).
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 font-sans">
                  Recipient wallet address
                </label>
                <input
                  type="text"
                  value={destAccount}
                  onChange={(e) => setDestAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-sans focus:outline-none focus:ring-2 focus:ring-[var(--button-bg)] font-mono text-sm"
                  placeholder="Recipient wallet (we derive their IncoToken account for this mint)"
                />
              </div>
            </div>
          </div>

          {/* Transfer Button */}
          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-serif mb-4">
              Step 3: Execute Transfer
            </h2>
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-200 font-sans">
              <strong>Devnet + Phantom:</strong> Phantom may warn &quot;account may fail due to insufficient SOL&quot; even if you have 2+ SOL. This is a known devnet quirk. The transfer only needs ~0.000005 SOL in fees. If you&apos;re on Devnet and have SOL, you can <strong>approve anyway</strong> and it will usually succeed.
            </div>
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
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-sans mb-2">
                To enable full transfer functionality:
              </p>
              <ol className="text-xs text-yellow-700 dark:text-yellow-300 font-sans space-y-1 ml-4">
                <li>1. Deploy custom token: <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">yarn deploy-token</code></li>
                <li>2. Build IncoToken program: <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">cd lightning-rod-solana && anchor build</code></li>
                <li>3. Facilitator integration will be added later</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
