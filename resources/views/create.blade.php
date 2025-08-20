<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Create Listing - soipattaya</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        body {
            font-family: sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
            color: #333;
        }

        h2 {
            color: #cc0000;
        }

        form {
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 700px;
            margin: 0 auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        label {
            font-weight: bold;
            margin-top: 15px;
            display: block;
        }

        input, textarea, select {
            width: 100%;
            padding: 10px;
            margin-top: 5px;
            margin-bottom: 15px;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-sizing: border-box;
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        input[type=number] {
            -moz-appearance: textfield;
        }

        textarea {
            min-height: 250px;
        }

        button {
            background: #cc0000;
            color: white;
            border: none;
            padding: 12px 20px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
        }

        button:hover {
            background: #a30000;
        }

        .payment-section {
            margin-top: 20px;
            padding: 20px;
            border: 2px solid #eee;
            border-radius: 10px;
        }

        .payment-option {
            display: none;
            margin-top: 15px;
        }

        .payment-option.active {
            display: block;
        }

        .qr-container {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
        }

        .qr-code {
            margin: 10px 0;
        }

        .wallet-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
            flex-wrap: wrap;
        }

        .wallet-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            font-size: 14px;
        }

        .wallet-btn:hover {
            background: #0056b3;
        }

        .solana-btn {
            background: #9945FF;
        }

        .solana-btn:hover {
            background: #7a35cc;
        }

        .aptos-btn {
            background: #3B82F6;
        }

        .aptos-btn:hover {
            background: #2563eb;
        }

        .copyable {
            background: #eee;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            word-break: break-word;
            margin: 10px 0;
        }

        .copyable:active {
            background: #ccc;
        }

        .errors {
            color: red;
            background: #ffe6e6;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
        }

        .center-button {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }

        .network-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .network-option {
            flex: 1;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s;
        }

        .network-option.active {
            border-color: #007bff;
            background: #f0f8ff;
        }

        .network-option:hover {
            border-color: #007bff;
        }
    </style>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard!');
            });
        }

        function selectNetwork(network) {
            // Update network selector
            document.querySelectorAll('.network-option').forEach(opt => opt.classList.remove('active'));
            document.querySelector(`[data-network="${network}"]`).classList.add('active');
            
            // Update hidden input
            document.getElementById('payment_network').value = network;
            
            // Show/hide payment options
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
            document.getElementById(`${network}-payment`).classList.add('active');
            
            // Generate new reference for the selected network
            if (network === 'solana') {
                solanaReference = solanaWeb3.Keypair.generate().publicKey.toBase58();
                document.getElementById('reference').value = solanaReference;
            } else {
                aptosReference = generateAptosReference();
                document.getElementById('reference').value = aptosReference;
            }
            
            // Generate new QR codes
            generateQRCodes();
        }

        function generateQRCodes() {
            const network = document.getElementById('payment_network').value;
            const reference = document.getElementById('reference').value;
            
            if (network === 'solana') {
                generateSolanaQR(reference);
            } else {
                generateAptosQR(reference);
            }
        }
    </script>
</head>
<body>

    <h2 style="text-align:center;">📝 Create New Listing</h2>

    @if ($errors->any())
        <div class="errors">
            <ul>@foreach ($errors->all() as $error) <li>{{ $error }}</li> @endforeach</ul>
        </div>
    @endif

    <form method="POST" action="/post">
        @csrf
        <input type="hidden" name="reference" id="reference" value="{{ old('reference') }}">
        <input type="hidden" name="payment_network" id="payment_network" value="solana">

        <label>📍 Google Maps Coordinates:</label>
        <input name="coordinates" placeholder="13.736717,100.523186" value="{{ old('coordinates') }}" >

        <label>🏢 Building Name:</label>
        <input name="building_name" value="{{ old('building_name') }}" >

        <label>🪜 Floor:</label>
        <input name="floor" value="{{ old('floor') }}" >

        <label>📐 SQM:</label>
        <input name="sqm" type="number" value="{{ old('sqm') }}" >

        <label>💰 Cost (Baht):</label>
        <input name="cost" type="number" value="{{ old('cost') }}" >

        <label>📝 Description (you can use emojis, new lines, etc.):</label>
        <textarea name="description" rows="5" >{{ old('description') }}</textarea>

        <label>▶️ YouTube Embed Link:</label>
        <input name="youtube_link" value="{{ old('youtube_link') }}" >

        <div class="payment-section">
            <h3>💳 Payment Method</h3>
            <p>Choose your preferred blockchain network and pay 1 USDC to create your listing:</p>
            
            <div class="network-selector">
                <div class="network-option active" data-network="solana" onclick="selectNetwork('solana')">
                    <strong>Solana</strong>
                </div>
                <div class="network-option" data-network="aptos" onclick="selectNetwork('aptos')">
                    <strong>Aptos</strong>
                </div>
            </div>

            <!-- Solana Payment Option -->
            <div id="solana-payment" class="payment-option active">
                <div class="qr-container">
                    <h4>🌞 Solana Payment</h4>
                    <div class="qr-code">
                        <canvas id="solana-qr"></canvas>
                    </div>
                    <div class="wallet-buttons">
                        <a href="#" class="wallet-btn solana-btn" onclick="openSolanaWallet()">Open Phantom</a>
                        <a href="#" class="wallet-btn solana-btn" onclick="openSolflare()">Open Solflare</a>
                    </div>
                </div>
            </div>

            <!-- Aptos Payment Option -->
            <div id="aptos-payment" class="payment-option">
                <div class="qr-container">
                    <h4>🟢 Aptos Payment</h4>
                    <div class="qr-code">
                        <canvas id="aptos-qr"></canvas>
                    </div>
                    <div class="wallet-buttons">
                        <a href="#" class="wallet-btn aptos-btn" onclick="openPetra()">Open Petra</a>
                        <a href="#" class="wallet-btn aptos-btn" onclick="openMartian()">Open Martian</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="center-button">
            <button type="submit" id="submit-btn">✅ Submit Listing</button>
        </div>
    </form>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@solana/web3.js@1.78.2/lib/index.iife.min.js"></script>

    <script>
        let solanaReference = '';
        let aptosReference = '';

        window.onload = function() {
            // Generate initial references
            solanaReference = solanaWeb3.Keypair.generate().publicKey.toBase58();
            aptosReference = generateAptosReference();
            
            document.getElementById('reference').value = solanaReference;
            generateQRCodes();
        };

        function generateAptosReference() {
            // Generate a random reference for Aptos
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 32; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        function generateSolanaQR(reference) {
            const recipient = new solanaWeb3.PublicKey('{{ env("SOLANA_WALLET", "3BVC8axBgNE8sopUMqYq5ros5szmcxrYmXPgJEmGnZPy") }}');
            const usdcMint = new solanaWeb3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
            const amount = 1;

            const url = `solana:${recipient.toBase58()}?amount=${amount}` +
                        `&spl-token=${usdcMint.toBase58()}` +
                        `&reference=${reference}` +
                        `&label=SoiPattaya` +
                        `&message=Listing_Payment_${reference.slice(0,8)}`;
            
            new QRious({
                element: document.getElementById('solana-qr'),
                value: url,
                size: 250
            });
        }

        function generateAptosQR(reference) {
            const recipient = '{{ env("APTOS_WALLET", "0x1234567890abcdef") }}';
            const amount = 1000000; // 1 USDC in smallest units (6 decimals)
            
            // Aptos Pay URL format
            const url = `aptos://pay?address=${recipient}&amount=${amount}&reference=${reference}&label=SoiPattaya`;
            
            new QRious({
                element: document.getElementById('aptos-qr'),
                value: url,
                size: 250
            });
        }

        function openSolanaWallet(event) {
            event.preventDefault();
            const recipient = '{{ env("SOLANA_WALLET", "3BVC8axBgNE8sopUMqYq5ros5szmcxrYmXPgJEmGnZPy") }}';
            const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            const reference = document.getElementById('reference').value;
            const amount = 1;

            const url = `solana:${recipient}?amount=${amount}` +
                        `&spl-token=${usdcMint}` +
                        `&reference=${reference}` +
                        `&label=SoiPattaya` +
                        `&message=Listing_Payment_${reference.slice(0,8)}`;
            
            window.open(url, '_blank');
        }

        function openSolflare(event) {
            event.preventDefault();
            const recipient = '{{ env("SOLANA_WALLET", "3BVC8axBgNE8sopUMqYq5ros5szmcxrYmXPgJEmGnZPy") }}';
            const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            const reference = document.getElementById('reference').value;
            const amount = 1;

            const url = `solflare://solana:${recipient}?amount=${amount}` +
                        `&spl-token=${usdcMint}` +
                        `&reference=${reference}` +
                        `&label=SoiPattaya` +
                        `&message=Listing_Payment_${reference.slice(0,8)}`;
            
            window.open(url, '_blank');
        }

        function openPetra(event) {
            event.preventDefault();
            const recipient = '{{ env("APTOS_WALLET", "0x1234567890abcdef") }}';
            const amount = 1000000;
            const reference = document.getElementById('reference').value;
            
            const url = `petra://pay?address=${recipient}&amount=${amount}&reference=${reference}&label=SoiPattaya`;
            window.open(url, '_blank');
        }

        function openMartian(event) {
            event.preventDefault();
            const recipient = '{{ env("APTOS_WALLET", "0x1234567890abcdef") }}';
            const amount = 1000000;
            const reference = document.getElementById('reference').value;
            
            const url = `martian://pay?address=${recipient}&amount=${amount}&reference=${reference}&label=SoiPattaya`;
            window.open(url, '_blank');
        }


    </script>

</body>
</html>