import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import * as solanaWeb3 from '@solana/web3.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function PaymentQRModal({ network, amount, reference, merchantAddress, onClose, onSuccess, listingData }) {
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  // Detect Phantom wallet
  const detectPhantom = () => {
    const win = window;
    if (win.solana?.isPhantom) return win.solana;
    if (win.phantom?.solana?.isPhantom) return win.phantom.solana;
    return null;
  };

  useEffect(() => {
    if (network !== 'solana') return;

    const initPayment = async () => {
      try {
        // Step 1: Create Solana Pay URL
        const params = new URLSearchParams({
          amount: amount.toString(),
          'spl-token': USDC_MINT,
          reference: reference,
          label: 'soiPattaya Listing',
          message: 'Property Listing Payment'
        });
        const url = `solana:${merchantAddress}?${params.toString()}`;
        setQrUrl(url);

        // Step 2: Try Phantom wallet first (desktop)
        const provider = detectPhantom();
        if (provider) {
          try {
            await provider.connect();
            const payerPk = provider.publicKey;

            // Get transaction from backend
            const resp = await axios.post('/api/transaction', {
              payer: payerPk.toBase58(),
              recipient: merchantAddress,
              amount: amount,
              reference: reference
            });

            const { transaction } = resp.data;

            // Sign and send
            const txBuffer = Uint8Array.from(atob(transaction), c => c.charCodeAt(0));
            const tx = solanaWeb3.Transaction.from(txBuffer);
            await provider.signAndSendTransaction(tx);
            
            setLoading(false);
          } catch (walletErr) {
            // Phantom failed, show QR code
            console.log('Phantom failed, showing QR:', walletErr);
            setShowQR(true);
            setLoading(false);
          }
        } else {
          // No Phantom detected, show QR code for mobile
          setShowQR(true);
          setLoading(false);
        }

        // Step 3: Poll for payment confirmation (5 second intervals to avoid rate limits)
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const r = await axios.get(`/api/payment/check/solana/${reference}`);
            if (r.data?.confirmed) {
              setPaid(true);
              setShowQR(false);
              await submitListing();
              return;
            }
          } catch {}
        }
        
        // Timeout after 2 minutes
        setShowQR(false);
        setLoading(false);
        alert('Payment timeout. If payment completed, wait a few minutes. Otherwise, try again.');
        onClose();
      } catch (e) {
        console.error('Payment error:', e);
        alert(e?.message || String(e));
        onClose();
      }
    };

    initPayment();
  }, [network, amount, reference, merchantAddress]);

  const submitListing = async () => {
    try {
      await axios.post('/api/listings', listingData);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Failed to create listing:', error);
      alert('Failed to create listing. Please try again.');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={showQR ? () => setShowQR(false) : undefined}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Pay with Solana</h2>
          <p className="text-3xl font-bold mt-2">{amount} USDC</p>
        </div>

        {/* Loading state */}
        {loading && !showQR && !paid && (
          <div className="text-center">
            <div className="text-6xl mb-4">🔗</div>
            <p className="text-blue-600 font-bold text-xl">Connecting to wallet...</p>
            <p className="text-sm text-gray-500 mt-2">Please approve the connection</p>
          </div>
        )}

        {/* Waiting for payment (Phantom used, no QR) */}
        {!loading && !showQR && !paid && (
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-blue-600 font-bold text-xl">Waiting for payment...</p>
            <p className="text-sm text-gray-500 mt-2">
              Please complete the transaction in your wallet
            </p>
          </div>
        )}

        {/* QR Code */}
        {showQR && qrUrl && !paid && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block mb-4 border-4 border-purple-100">
              <QRCodeSVG value={qrUrl} size={256} level="H" />
            </div>
            <p className="text-gray-700 mb-2 font-medium">
              Scan with your Solana wallet
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Waiting for payment confirmation...
            </p>
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-800">
                💡 <strong>Mobile:</strong> Open your wallet and scan this QR code
              </p>
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 text-gray-500 text-sm hover:text-gray-700"
            >
              Close QR Code
            </button>
          </div>
        )}

        {/* Payment confirmed */}
        {paid && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 font-bold text-xl">Payment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-2">Creating your listing...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentQRModal;
