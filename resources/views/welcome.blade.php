<!DOCTYPE html>
<html>
<head>
  <title>Solana Pay - QR Code</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
</head>
<body>
  <h2>Solana Pay QR for 1 USDC</h2>
  <button onclick="generateQr()">Generate QR</button>
  <br><br>
  <canvas id="qr"></canvas>

  <script src="https://cdn.jsdelivr.net/npm/@solana/web3.js@1.78.2/lib/index.iife.min.js"></script>
  <script>
    async function generateQr() {
      const recipient = new solanaWeb3.PublicKey('CckxW6C1CjsxYcXSiDbk7NYfPLhfqAm3kSB5LEZunnSE');
      const usdcMint = new solanaWeb3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const reference = solanaWeb3.Keypair.generate().publicKey;
      const amount = 1;

      const url = `solana:${recipient.toBase58()}?amount=${amount}&spl-token=${usdcMint.toBase58()}&reference=${reference.toBase58()}&label=Demo&message=1%20USDC%20payment&memo=DemoMemo`;

      const qr = new QRious({
        element: document.getElementById('qr'),
        value: url,
        size: 250
      });

      console.log("Solana Pay URL:", url);
    }
  </script>
</body>
</html>
