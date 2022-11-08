import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const TEST_ACCOUNT = new web3.PublicKey('B1aLAAe4vW8nSQCetXnYqJfRxzTjnbooczwkUJAr7yMS');

async function initializeKeypair(
    connection: web3.Connection
  ): Promise<web3.Keypair> {
    if (!process.env.PRIVATE_KEY) {
      console.log('Generating new keypair... 🗝️');
      const signer = web3.Keypair.generate();
  
      console.log('Creating .env file');
      fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

      await airdropSolIfNeeded(signer, connection);
  
      return signer;
    }
  
    const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[];
    const secretKey = Uint8Array.from(secret);
    const keypairFromSecret = web3.Keypair.fromSecretKey(secretKey);
    await airdropSolIfNeeded(keypairFromSecret, connection);
    return keypairFromSecret;
}

async function airdropSolIfNeeded(
    signer: web3.Keypair,
    connection: web3.Connection
  ) {
    const balance = await connection.getBalance(signer.publicKey);
    console.log('Current balance is', balance / web3.LAMPORTS_PER_SOL, 'SOL');
  
    if (balance / web3.LAMPORTS_PER_SOL < 1) {
      // You can only get up to 2 SOL per request 
      console.log('Airdropping 1 SOL');
      const airdropSignature = await connection.requestAirdrop(
        signer.publicKey,
        web3.LAMPORTS_PER_SOL
      );
  
      const latestBlockhash = await connection.getLatestBlockhash();
  
      await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: airdropSignature,
      });
  
      const newBalance = await connection.getBalance(signer.publicKey);
      console.log('New balance is', newBalance / web3.LAMPORTS_PER_SOL, 'SOL');
    }
}

async function transferSol(
    sender: web3.Keypair, 
    amount: number, 
    recipient: web3.PublicKey, 
    connection: web3.Connection
    ) {
        const transaction = new web3.Transaction();
        const instruction = web3.SystemProgram.transfer(
            {
                fromPubkey: sender.publicKey,
                toPubkey: recipient,
                lamports: web3.LAMPORTS_PER_SOL * amount
            }
        );

        transaction.add(instruction);

        console.log('Sending sol... 💸')
        const sig = await web3.sendAndConfirmTransaction(
            connection, 
            transaction, 
            [sender]
        );

        console.log(
            `View transaction: https://explorer.solana.com/tx/${sig}?cluster=devnet`
        );
}

async function main() {
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'));
    const payer = await initializeKeypair(connection); 

    console.log("Public key:", payer.publicKey.toBase58());

    await transferSol(payer, 0.1, TEST_ACCOUNT, connection);
}

main()
    .then(() => {
        console.log("Finished successfully")
        process.exit(0)
    })
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })

