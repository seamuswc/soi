import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

function PaymentQRModal({ network, amount, reference, merchantAddress, onClose, onSuccess }) {
  const [paymentUrl, setPaymentUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('pending'); // pending, checking, confirmed, failed
  const [checkInterval, setCheckInterval] = useState(null);

  useEffect(() => {
    generatePaymentUrl();
    
    // Start checking for payment after 3 seconds
    const checkTimer = setTimeout(() => {
      startPaymentCheck();
    }, 3000);

    return () => {
      clearTimeout(checkTimer);
      // Clean up payment checking when modal closes
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      setChecking(false);
    };
  }, [checkInterval]);

  const generatePaymentUrl = () => {
    // Generate proper wallet deep links with all payment info pre-filled
    let paymentUrl = '';
    
    switch(network) {
      case 'solana':
        // Solana Pay standard URL format
        paymentUrl = `solana:${merchantAddress}?amount=${amount}&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=${reference}&label=SoiPattaya&message=Property%20Listing%20Payment`;
        break;
        
      case 'aptos':
        // Aptos wallet URL format (Petra/Pontem compatible)
        paymentUrl = `https://aptoslabs.com/wallet/send?to=${merchantAddress}&amount=${amount}&coin=0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T&memo=${reference}`;
        break;
        
      case 'sui':
        // Sui wallet URL format
        paymentUrl = `https://sui.io/wallet/send?recipient=${merchantAddress}&amount=${amount * 1000000}&coin=0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN&memo=${reference}`;
        break;
        
      case 'base':
        // Base/Ethereum wallet URL format (EIP-681)
        // USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        const usdcBase = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
        const amountInSmallestUnit = (amount * 1000000).toString(16); // USDC has 6 decimals
        paymentUrl = `ethereum:${usdcBase}@8453/transfer?address=${merchantAddress}&uint256=${amountInSmallestUnit}`;
        break;
        
      default:
        paymentUrl = `Network: ${network.toUpperCase()}\nTo: ${merchantAddress}\nAmount: ${amount} USDC\nReference: ${reference}`;
    }
    
    setPaymentUrl(paymentUrl);
  };

  const startPaymentCheck = async () => {
    setChecking(true);
    setStatus('checking');
    
    // Poll for payment every 2 seconds for up to 5 minutes
    const maxAttempts = 150; // 5 minutes
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await axios.get(`/api/payment/check/${network}/${reference}`);
        
        if (response.data.confirmed) {
          setStatus('confirmed');
          clearInterval(interval);
          setCheckInterval(null);
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setCheckInterval(null);
        setStatus('failed');
      }
    }, 2000);
    
    setCheckInterval(interval);
  };

  const getNetworkName = () => {
    const names = {
      solana: 'Solana',
      aptos: 'Aptos',
      sui: 'Sui',
      base: 'Base (Ethereum)'
    };
    return names[network] || network;
  };

  const getNetworkColor = () => {
    const colors = {
      solana: 'from-purple-600 to-purple-700',
      aptos: 'from-blue-600 to-blue-700',
      sui: 'from-cyan-600 to-cyan-700',
      base: 'from-blue-600 to-blue-700'
    };
    return colors[network] || 'from-gray-600 to-gray-700';
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        {/* Header */}
        <div className={`bg-gradient-to-r ${getNetworkColor()} text-white rounded-xl p-6 mb-6 text-center`}>
          <h2 className="text-2xl font-bold mb-2">Scan to Pay</h2>
          <p className="text-sm opacity-90">{getNetworkName()}</p>
          <p className="text-3xl font-bold mt-2">{amount} USDC</p>
        </div>

        {/* Payment Details */}
        {status === 'pending' && merchantAddress && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm">
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-gray-700">Send to:</span>
                <p className="text-xs font-mono text-gray-600 break-all mt-1">{merchantAddress}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Amount:</span>
                <p className="text-gray-600">{amount} USDC</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Memo/Reference:</span>
                <p className="text-xs font-mono text-gray-600 break-all mt-1">{reference}</p>
              </div>
            </div>
          </div>
        )}

        {status === 'checking' && (
          <div className="text-center mb-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
            <p className="text-blue-600 font-medium">Waiting for payment...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">✅</div>
            <p className="text-green-600 font-bold text-xl">Payment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">⏱️</div>
            <p className="text-orange-600 font-medium">Payment timeout</p>
            <p className="text-sm text-gray-500 mt-1">Please try again or contact support</p>
          </div>
        )}

        {/* QR Code */}
        {status !== 'confirmed' && paymentUrl && (
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <QRCodeSVG
                value={paymentUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        {status === 'pending' && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium mb-2">📱 How to pay:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Scan the QR code with your {getNetworkName()} wallet app</li>
              <li>Review the pre-filled payment details</li>
              <li>Confirm the transaction in your wallet</li>
              <li>Payment will be detected automatically</li>
            </ol>
            <p className="text-xs text-gray-500 mt-3 font-semibold">
              ✨ Everything is pre-filled - just scan and confirm!
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Or manually send to the address above if your wallet doesn't support QR scanning
            </p>
          </div>
        )}

        {/* Reference ID - Copyable */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              navigator.clipboard.writeText(reference);
              alert('Reference copied to clipboard!');
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer"
          >
            📋 Copy Reference: {reference.substring(0, 16)}...
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentQRModal;

