import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import * as solanaWeb3 from '@solana/web3.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function PaymentQRModal({ network, amount, reference, merchantAddress, onClose, onSuccess, listingData }) {
  const [status, setStatus] = useState('connecting'); // connecting, qr, polling, confirmed, failed
  const [pollCount, setPollCount] = useState(0);
  const [qrUrl, setQrUrl] = useState('');
  const maxPolls = 60; // 2 minutes (60 polls x 2 seconds)

  // Detect Phantom wallet
  const detectPhantom = () => {
    const win = window;
    if (win.solana?.isPhantom) return win.solana;
    if (win.phantom?.solana?.isPhantom) return win.phantom.solana;
    return null;
  };

  useEffect(() => {
    if (network === 'solana') {
      // Generate Solana Pay QR URL
      const params = new URLSearchParams({
        amount: amount.toString(),
        'spl-token': USDC_MINT,
        reference: reference,
        label: 'soiPattaya Listing',
        message: 'Property Listing Payment'
      });
      const solanaPayUrl = `solana:${merchantAddress}?${params.toString()}`;
      setQrUrl(solanaPayUrl);

      // Try to use Phantom wallet first
      const tryPhantom = async () => {
        const phantom = detectPhantom();
        if (phantom) {
          try {
            // Connect to Phantom
            await phantom.connect();
            
            // Fetch pre-built transaction from backend
            const resp = await axios.post('/api/transaction', {
              payer: phantom.publicKey.toBase58(),
              recipient: merchantAddress,
              amount: amount,
              reference: reference
            });

            const { transaction } = resp.data;
            
            // Deserialize and sign transaction
            const tx = solanaWeb3.Transaction.from(
              Uint8Array.from(atob(transaction), c => c.charCodeAt(0))
            );
            
            await phantom.signAndSendTransaction(tx);
            
            // Start polling for payment confirmation
            setStatus('polling');
          } catch (error) {
            console.log('Phantom failed, showing QR:', error);
            // Fall back to QR code
            setStatus('qr');
          }
        } else {
          // No Phantom detected, show QR
          setStatus('qr');
        }
      };

      tryPhantom();
    }
  }, [network, amount, reference, merchantAddress]);

  // Start polling when in QR or polling state
  useEffect(() => {
    if ((status !== 'qr' && status !== 'polling') || network !== 'solana') return;

    const pollInterval = setInterval(async () => {
      setPollCount(prev => {
        const newCount = prev + 1;
        if (newCount >= maxPolls) {
          clearInterval(pollInterval);
          setStatus('failed');
          return newCount;
        }
        return newCount;
      });

      try {
        const response = await axios.get(`/api/payment/check/solana/${reference}`);
        if (response.data.confirmed) {
          clearInterval(pollInterval);
          setStatus('confirmed');
          
          // Auto-submit listing on successful payment
          await submitListing();
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [status, reference, network]);

  const submitListing = async () => {
    try {
      await axios.post('/api/listings', listingData);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Failed to create listing:', error);
      setStatus('failed');
    }
  };

  const getNetworkName = () => {
    const names = {
      solana: 'Solana',
      thb: 'Thai Baht'
    };
    return names[network] || network;
  };

  const getNetworkColor = () => {
    const colors = {
      solana: 'from-purple-600 to-indigo-600',
      thb: 'from-green-600 to-green-700'
    };
    return colors[network] || 'from-gray-600 to-gray-700';
  };

  const timeRemaining = Math.ceil((maxPolls - pollCount) * 2 / 60);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
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

        <div className={`bg-gradient-to-r ${getNetworkColor()} text-white rounded-xl p-6 mb-6 text-center`}>
          <h2 className="text-2xl font-bold mb-2">Pay with {getNetworkName()}</h2>
          <p className="text-3xl font-bold mt-2">{amount} USDC</p>
        </div>

        {status === 'connecting' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🔗</div>
            <p className="text-blue-600 font-bold text-xl">Connecting to Phantom...</p>
            <p className="text-sm text-gray-500 mt-2">Please approve the connection</p>
          </div>
        )}

        {status === 'polling' && (
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-blue-600 font-bold text-xl">Waiting for Transaction...</p>
            <p className="text-sm text-gray-500 mt-2">
              Checking for payment confirmation... ({timeRemaining} min remaining)
            </p>
          </div>
        )}

        {status === 'qr' && network === 'solana' && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <QRCodeSVG value={qrUrl} size={256} />
            </div>
            <p className="text-gray-700 mb-2 font-medium">
              Scan with Phantom, Solflare, or any Solana wallet
            </p>
            <p className="text-sm text-gray-500">
              Checking for payment... ({timeRemaining} min remaining)
            </p>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Desktop users:</strong> Click the QR with your mobile wallet app
              </p>
            </div>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 font-bold text-xl">Payment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-2">Creating your listing...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="text-6xl mb-4">⏱️</div>
            <p className="text-orange-600 font-medium text-lg">Payment Timeout</p>
            <p className="text-sm text-gray-500 mt-2 mb-4">
              No payment detected within 2 minutes.<br/>
              Please try again or use a different payment method.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Close & Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentQRModal;
