import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import * as solanaWeb3 from '@solana/web3.js';
import { getDomainConfig } from '../utils/domainConfig';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function PaymentQRModal({ network, amount, reference, merchantAddress, onClose, onSuccess, listingData }) {
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [promoForm, setPromoForm] = useState({
    max_listings: 1
  });
  const [generatedPromo, setGeneratedPromo] = useState(null);
  const [showListingSelection, setShowListingSelection] = useState(false);
  const [paidAmount, setPaidAmount] = useState(null); // Store the amount actually paid
  
  // Get domain-specific configuration
  const domainConfig = getDomainConfig();

  // Detect Phantom wallet
  const detectPhantom = () => {
    const win = window;
    if (win.solana?.isPhantom) return win.solana;
    if (win.phantom?.solana?.isPhantom) return win.phantom.solana;
    return null;
  };

  useEffect(() => {
    if (network !== 'solana' && network !== 'promo') return;

    // For promo code purchases, show listing selection first
    if (network === 'promo') {
      setShowListingSelection(true);
      setLoading(false);
      return;
    }

    const initPayment = async () => {
      try {
        // Step 1: Create Solana Pay URL
        const label = `${domainConfig.siteName} Listing`;
        const message = 'Property Listing Payment';
        
        const params = new URLSearchParams({
          amount: amount.toString(),
          'spl-token': USDC_MINT,
          reference: reference,
          label: label,
          message: message
        });
        const url = `solana:${merchantAddress}?${params.toString()}`;
        console.log('🔗 Generated QR URL:', url);
        console.log('💰 Amount:', amount, 'Merchant:', merchantAddress);
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
              
              // Handle different payment types
              if (network === 'promo') {
                console.log('🎟️ Payment confirmed for promo code purchase');
                await generatePromoCode();
              } else {
                await submitListing();
              }
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
      // Submit listing for Solana payments
      await axios.post('/api/listings', listingData);
      
      // Show success message for 3 seconds, then redirect
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (error) {
      console.error('Failed to create listing:', error);
      alert('Failed to create listing. Please try again.');
      onClose();
    }
  };

  const generatePromoCode = async () => {
    try {
      // Use paidAmount if available, otherwise fall back to promoForm.max_listings
      const maxListings = paidAmount || promoForm.max_listings;
      console.log('🎟️ Generating promo code with max_listings:', maxListings, 'paidAmount:', paidAmount);
      
      const response = await axios.post('/api/promo/generate-after-payment', {
        reference: reference,
        max_listings: maxListings
      });
      
      console.log('🎟️ Promo code generated:', response.data);
      setGeneratedPromo(response.data);
      console.log('🎟️ generatedPromo state set to:', response.data);
    } catch (error) {
      console.error('Failed to generate promo code:', error);
      alert('Failed to generate promo code. Please try again.');
    }
  };

  const handlePromoFormChange = (e) => {
    const { name, value } = e.target;
    setPromoForm(prev => ({
      ...prev,
      [name]: name === 'max_listings' ? parseInt(value) || 1 : value
    }));
  };

  // Set the form to the paid amount when payment is successful
  useEffect(() => {
    if (paid && paidAmount) {
      setPromoForm(prev => ({
        ...prev,
        max_listings: paidAmount
      }));
    }
  }, [paid, paidAmount]);

  const proceedToPayment = async () => {
    try {
      // Calculate total amount based on selected listings
      const totalAmount = promoForm.max_listings;
      
      // Store the paid amount to limit future selections
      setPaidAmount(totalAmount);
      
      // Create Solana Pay URL for promo code purchase
      const params = new URLSearchParams({
        amount: totalAmount.toString(),
        'spl-token': USDC_MINT,
        reference: reference,
        label: `${domainConfig.siteName} Promo Code`,
        message: 'Promo Code Purchase'
      });
      const url = `solana:${merchantAddress}?${params.toString()}`;
      console.log('🎟️ Generated Promo QR URL:', url);
      console.log('🎟️ Amount:', totalAmount, 'Merchant:', merchantAddress);
      setQrUrl(url);
      
      setShowListingSelection(false);
      setShowQR(true);
      
      // Start polling for payment confirmation
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const r = await axios.get(`/api/payment/check/solana/${reference}`);
          if (r.data?.confirmed) {
            setPaid(true);
            setShowQR(false);
            setShowPromoForm(true);
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

        {/* Only show header if promo code hasn't been generated yet */}
        {console.log('🎟️ Modal render - generatedPromo:', generatedPromo, 'network:', network)}
        {!generatedPromo && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6 mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">{network === 'promo' ? 'Buy Promo Code with Solana' : 'Pay with Solana'}</h2>
            <p className="text-3xl font-bold mt-2">{network === 'promo' ? promoForm.max_listings : amount} USDC</p>
          </div>
        )}

        {/* Listing selection for promo code purchase */}
        {showListingSelection && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎟️</div>
            <p className="text-purple-600 font-bold text-xl mb-4">Select Your Promo Code</p>
            <p className="text-sm text-gray-500 mb-6">Choose how many listings you want for your promo code:</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Listings
                </label>
                <input
                  type="number"
                  name="max_listings"
                  value={promoForm.max_listings}
                  onChange={handlePromoFormChange}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  placeholder="Enter number of listings"
                />
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  💡 <strong>Total:</strong> {promoForm.max_listings} listing{promoForm.max_listings > 1 ? 's' : ''} for {promoForm.max_listings} USDC
                </p>
              </div>
              
              <button
                onClick={proceedToPayment}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-4 rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                💳 Pay {promoForm.max_listings} USDC & Get Promo Code
              </button>
            </div>
          </div>
        )}

        {/* Loading state - only for regular Solana payments */}
        {loading && !showQR && !paid && network !== 'promo' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🔗</div>
            <p className="text-blue-600 font-bold text-xl">Connecting to wallet...</p>
            <p className="text-sm text-gray-500 mt-2">Please approve the connection</p>
          </div>
        )}

        {/* Waiting for payment (Phantom used, no QR) - only for regular Solana payments */}
        {!loading && !showQR && !paid && network !== 'promo' && (
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
              onClick={onClose}
              className="mt-4 text-gray-500 text-sm hover:text-gray-700"
            >
              Close
            </button>
          </div>
        )}


        {/* Solana payment success message */}
        {paid && network === 'solana' && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 font-bold text-xl mb-4">Payment Successful!</p>
            <p className="text-gray-600 mb-4">Your listing has been created successfully.</p>
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                🎉 <strong>Success!</strong> Your property listing is now live on the map.
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirecting to homepage...</p>
          </div>
        )}

        {/* Generated promo code */}
        {generatedPromo && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎟️</div>
            <p className="text-green-600 font-bold text-xl mb-4">Promo Code Generated!</p>
            
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Your Promo Code:</p>
              <p className="text-2xl font-mono font-bold text-gray-800 break-all">{generatedPromo.code}</p>
              <p className="text-xs text-gray-500 mt-2">
                Valid for {generatedPromo.max_listings} listing{generatedPromo.max_listings > 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => navigator.clipboard.writeText(generatedPromo.code)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                📋 Copy Code
              </button>
              
              <a
                href="/create"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors inline-block"
              >
                🏠 Create Listing with Code
              </a>
              
              <button
                onClick={() => {
                  // Pass the promo code to the success handler
                  if (onSuccess) {
                    onSuccess(generatedPromo.code);
                  }
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                ✅ Use This Promo Code
              </button>
              
              <button
                onClick={onClose}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentQRModal;
