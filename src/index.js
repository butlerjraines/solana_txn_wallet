import { Buffer } from 'buffer';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

let network;
let receiverPublicKeyString;
let solAmount;

// Fetch configuration from the server
async function fetchConfig() {
  try {
    const response = await fetch('/config');
    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }
    const config = await response.json();
    network = config.network;
    receiverPublicKeyString = config.receiverPublicKey;
    solAmount = config.solAmount || 0.01;

    console.log(`Loaded Network: ${network}`);
    console.log(`Loaded Receiver Public Key: ${receiverPublicKeyString}`);
    console.log(`SOL Amount to Send: ${solAmount}`);
  } catch (error) {
    console.error('Error fetching config:', error);
  }
}

// Function to show Bootstrap alert messages
function showAlert(message, type = 'info') {
  const responseElement = document.getElementById('response');
  responseElement.innerHTML = message;
  responseElement.className = `alert alert-${type} mt-3`;
  responseElement.classList.remove('d-none');
}

// Function to connect to the wallet and send a transaction
async function connectAndSendTransaction(providerName) {
  showAlert('Connecting to wallet...', 'info');

  try {
    let provider;
    if (providerName === 'phantom') {
      provider = window.phantom?.solana;
    } else if (providerName === 'solflare') {
      provider = window.solflare?.solana;
    }

    if (!provider || !(provider.isPhantom || provider.isSolflare)) {
      showAlert(`${providerName.charAt(0).toUpperCase() + providerName.slice(1)} wallet not found. Please install it.`, 'danger');
      return;
    }

    // Connect to the wallet
    try {
      await provider.connect();
      showAlert('Wallet connected successfully!', 'success');
    } catch (error) {
      if (error.message.includes('User rejected the request')) {
        showAlert('Connection cancelled by user.', 'warning');
        return;
      }
      throw error;
    }

    const publicKey = provider.publicKey;
    const connection = new Connection(network);

    // Check wallet balance
    const balance = await connection.getBalance(publicKey);
    console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    const requiredAmount = solAmount * LAMPORTS_PER_SOL;
    const estimatedFee = 5000; // Estimated fee in lamports (0.000005 SOL)

    if (balance < (requiredAmount + estimatedFee)) {
      showAlert('Insufficient balance. Please ensure your wallet has enough SOL to cover the transaction amount and fees.', 'danger');
      return;
    }

    // Validate the receiver's public key by constructing a PublicKey object
    const receiverPublicKey = new PublicKey(receiverPublicKeyString);
    console.log('Receiver Public Key:', receiverPublicKey.toString());

    // Create a transaction to send the specified SOL amount
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: receiverPublicKey,
        lamports: requiredAmount, // Use the SOL amount from the config
      })
    );

    // Fetch the recent blockhash and set it in the transaction
    const blockhashResponse = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhashResponse.blockhash;
    transaction.feePayer = publicKey;

    // Sign the transaction using the wallet
    try {
      const signedTransaction = await provider.signTransaction(transaction);
      showAlert('Transaction signed. Sending...', 'info');

      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      // Confirm the transaction
      await connection.confirmTransaction(signature, 'confirmed');

      // Link to Solscan
      const solscanLink = `https://solscan.io/tx/${signature}?cluster=mainnet`;
      showAlert(`Transaction successful! View on <a href="${solscanLink}" target="_blank">Solscan</a>`, 'success');
    } catch (error) {
      if (error.message.includes('User rejected the request')) {
        showAlert('Transaction cancelled by user.', 'warning');
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('An error occurred:', error);
    showAlert(`An error occurred: ${error.message}`, 'danger');
  }
}

// Fetch config when the page loads
fetchConfig();

// Set up event listeners for the wallet buttons
document.getElementById('phantomConnect').addEventListener('click', () => connectAndSendTransaction('phantom'));
document.getElementById('solflareConnect').addEventListener('click', () => connectAndSendTransaction('solflare'));