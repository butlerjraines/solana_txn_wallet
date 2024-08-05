const express = require('express');
const path = require('path');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config(); // Load environment variables

const app = express();
app.use(express.json()); // For parsing application/json

// Ensure the logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Set up CSV writer
const csvWriter = createCsvWriter({
  path: path.join(logDir, 'transactions.csv'),
  header: [
    { id: 'dateTime', title: 'DATE_TIME' },
    { id: 'senderAddress', title: 'SENDER_ADDRESS' },
    { id: 'ip', title: 'IP_ADDRESS' },
    { id: 'status', title: 'STATUS' },
    { id: 'signature', title: 'SIGNATURE' }
  ],
  append: true // Append to the file if it exists
});

// Endpoint to log transactions
app.post('/log-transaction', (req, res) => {
  const { dateTime, senderAddress, ip, status, signature } = req.body;
  const logEntry = { dateTime, senderAddress, ip, status, signature };

  csvWriter.writeRecords([logEntry])
    .then(() => {
      console.log('Logged transaction:', logEntry);
      res.status(200).send('Logged successfully');
    })
    .catch(err => {
      console.error('Failed to log transaction:', err);
      res.status(500).send('Logging failed');
    });
});

// Serve static files from the "dist" directory
app.use(express.static(path.join(__dirname, 'dist')));

// Endpoint to provide environment variables to the client
app.get('/config', (req, res) => {
  res.json({
    network: process.env.SOLANA_NETWORK,
    receiverPublicKey: process.env.RECEIVER_PUBLIC_KEY,
    solAmount: parseFloat(process.env.SOL_AMOUNT) || 0.01 // Default to 0.01 SOL if not specified
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Loaded Solana Network: ${process.env.SOLANA_NETWORK}`);
  console.log(`Loaded Receiver Public Key: ${process.env.RECEIVER_PUBLIC_KEY}`);
  console.log(`Sending SOL Amount: ${process.env.SOL_AMOUNT}`);
});