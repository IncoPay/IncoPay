/**
 * SPL Token Deployment Script
 * 
 * This script deploys a custom SPL token (similar to Inco token) on Solana devnet.
 * The token can be used for x402 payments and confidential transactions.
 */

import { 
    Connection, 
    Keypair, 
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import {
    createInitializeMintInstruction,
    createMintToInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMinimumBalanceForRentExemptMint,
    createSetAuthorityInstruction,
    AuthorityType
} from '@solana/spl-token';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface TokenConfig {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: number;
    mintAuthority?: string; // Optional: set to null after minting for immutability
}

/**
 * Generate a new keypair for the token mint
 */
function generateMintKeypair(): Keypair {
    const keypairPath = path.join(process.cwd(), 'token-mint-keypair.json');
    
    // Check if keypair already exists
    if (fs.existsSync(keypairPath)) {
        console.log('📁 Using existing mint keypair...');
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        return Keypair.fromSecretKey(Uint8Array.from(keypairData));
    }
    
    // Generate new keypair
    console.log('🔑 Generating new mint keypair...');
    const keypair = Keypair.generate();
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`✓ Keypair saved to: ${keypairPath}`);
    
    return keypair;
}

/**
 * Get or create payer keypair
 */
function getPayerKeypair(): Keypair {
    const payerPrivateKey = process.env.PAYER_PRIVATE_KEY;
    
    if (!payerPrivateKey || payerPrivateKey.trim() === '') {
        // Generate a new keypair if not provided
        console.log('⚠️  PAYER_PRIVATE_KEY not found. Generating new keypair...');
        const keypairPath = path.join(process.cwd(), 'payer-keypair.json');
        
        if (fs.existsSync(keypairPath)) {
            console.log('📁 Using existing payer keypair...');
            const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
            const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
            console.log(`✓ Using payer: ${keypair.publicKey.toBase58()}`);
            return keypair;
        }
        
        const keypair = Keypair.generate();
        fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
        console.log(`✓ New payer keypair generated and saved to: ${keypairPath}`);
        console.log(`  Payer address: ${keypair.publicKey.toBase58()}`);
        console.log(`  ⚠️  IMPORTANT: Fund this address with SOL before deploying token!`);
        console.log(`  Run: solana airdrop 2 ${keypair.publicKey.toBase58()} --url ${NETWORK}\n`);
        
        // Save to .env.local
        const envPath = path.join(process.cwd(), '.env.local');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }
        
        if (envContent.includes('PAYER_PRIVATE_KEY=')) {
            envContent = envContent.replace(
                /PAYER_PRIVATE_KEY=.*/,
                `PAYER_PRIVATE_KEY=${JSON.stringify(Array.from(keypair.secretKey))}`
            );
        } else {
            envContent += `\nPAYER_PRIVATE_KEY=${JSON.stringify(Array.from(keypair.secretKey))}\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log('✓ Payer private key saved to .env.local\n');
        
        return keypair;
    }
    
    // Handle both base58 and array format
    let secretKey: Uint8Array;
    try {
        // Try parsing as JSON array first
        secretKey = Uint8Array.from(JSON.parse(payerPrivateKey));
    } catch {
        // If not JSON, try base58 (would need bs58 library)
        throw new Error('PAYER_PRIVATE_KEY must be a JSON array of numbers. Example: [123,45,67,...]');
    }
    
    return Keypair.fromSecretKey(secretKey);
}

/**
 * Deploy SPL Token
 */
async function deployToken(config: TokenConfig): Promise<PublicKey> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SPL TOKEN DEPLOYMENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const payer = getPayerKeypair();
    const mintKeypair = generateMintKeypair();
    
    console.log(`📡 Network: ${NETWORK}`);
    console.log(`🔗 RPC URL: ${RPC_URL}`);
    console.log(`💳 Payer: ${payer.publicKey.toBase58()}`);
    console.log(`🪙 Mint: ${mintKeypair.publicKey.toBase58()}\n`);
    
    // Check payer balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 Payer balance: ${balance / 1e9} SOL`);
    
    // Get minimum balance for rent-exempt mint
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    const requiredBalance = mintRent + (0.01 * 1e9); // Mint rent + transaction fees
    
    console.log(`💵 Rent-exempt amount: ${mintRent / 1e9} SOL`);
    console.log(`💵 Required balance: ${requiredBalance / 1e9} SOL\n`);
    
    if (balance < requiredBalance) {
        console.error('❌ Insufficient balance!');
        console.error(`   Current: ${balance / 1e9} SOL`);
        console.error(`   Required: ${requiredBalance / 1e9} SOL`);
        console.error(`\n   Please airdrop SOL:`);
        console.error(`   solana airdrop 2 ${payer.publicKey.toBase58()} --url ${NETWORK}\n`);
        throw new Error(`Insufficient balance. Need at least ${requiredBalance / 1e9} SOL`);
    }
    
    // Step 1: Create and initialize mint account
    console.log('[1/4] Creating and initializing mint account...');
    
    // Create transaction with both account creation and initialization
    const mintTransaction = new Transaction();
    
    // Add instruction to create the mint account
    mintTransaction.add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: mintRent,
            programId: TOKEN_PROGRAM_ID,
        })
    );
    
    // Add instruction to initialize the mint
    mintTransaction.add(
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            config.decimals,
            payer.publicKey, // mint authority
            payer.publicKey  // freeze authority (can be null)
        )
    );
    
    console.log('   Sending transaction...');
    const signature = await sendAndConfirmTransaction(
        connection,
        mintTransaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
    );
    console.log(`✓ Mint created and initialized: ${signature}\n`);
    
    // Step 2: Create associated token account for payer
    console.log('[2/4] Creating associated token account...');
    const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey
    );
    
    const createATAInstruction = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mintKeypair.publicKey
    );
    
    const ataTransaction = new Transaction().add(createATAInstruction);
    const ataSignature = await sendAndConfirmTransaction(
        connection,
        ataTransaction,
        [payer]
    );
    console.log(`✓ ATA created: ${ataSignature}\n`);
    
    // Step 3: Mint initial supply
    console.log(`[3/4] Minting ${config.initialSupply} ${config.symbol}...`);
    const mintToInstruction = createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        config.initialSupply * Math.pow(10, config.decimals)
    );
    
    const mintToTransaction = new Transaction().add(mintToInstruction);
    const mintToSignature = await sendAndConfirmTransaction(
        connection,
        mintToTransaction,
        [payer]
    );
    console.log(`✓ Tokens minted: ${mintToSignature}\n`);
    
    // Step 4: (Optional) Revoke mint authority for immutability
    if (!config.mintAuthority) {
        console.log('[4/4] Revoking mint authority (making token immutable)...');
        const revokeInstruction = createSetAuthorityInstruction(
            mintKeypair.publicKey,
            payer.publicKey,
            AuthorityType.MintTokens,
            null // No new authority
        );
        
        const revokeTransaction = new Transaction().add(revokeInstruction);
        const revokeSignature = await sendAndConfirmTransaction(
            connection,
            revokeTransaction,
            [payer]
        );
        console.log(`✓ Mint authority revoked: ${revokeSignature}\n`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TOKEN DEPLOYMENT SUCCESSFUL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Token Details:');
    console.log(`  Name: ${config.name}`);
    console.log(`  Symbol: ${config.symbol}`);
    console.log(`  Decimals: ${config.decimals}`);
    console.log(`  Mint Address: ${mintKeypair.publicKey.toBase58()}`);
    console.log(`  Initial Supply: ${config.initialSupply} ${config.symbol}`);
    console.log(`  Owner Balance: ${config.initialSupply} ${config.symbol}\n`);
    
    // Save token info to .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Update or add token mint address
    if (envContent.includes('NEXT_PUBLIC_TOKEN_MINT=')) {
        envContent = envContent.replace(
            /NEXT_PUBLIC_TOKEN_MINT=.*/,
            `NEXT_PUBLIC_TOKEN_MINT=${mintKeypair.publicKey.toBase58()}`
        );
    } else {
        envContent += `\nNEXT_PUBLIC_TOKEN_MINT=${mintKeypair.publicKey.toBase58()}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✓ Token mint address saved to .env.local\n');
    
    return mintKeypair.publicKey;
}

// Main execution
if (require.main === module) {
    const tokenConfig: TokenConfig = {
        name: 'IncoPay Token',
        symbol: 'INCO',
        decimals: 9,
        initialSupply: 1000000, // 1M tokens
        mintAuthority: undefined // Will revoke after minting
    };
    
    deployToken(tokenConfig)
        .then((mintAddress) => {
            console.log(`\n🎉 Token deployed successfully!`);
            console.log(`   Mint: ${mintAddress.toBase58()}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Deployment failed:', error);
            process.exit(1);
        });
}

export { deployToken, TokenConfig };
