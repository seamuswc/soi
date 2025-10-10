import React, { useState, useEffect } from 'react';
import { Keypair, PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import axios from 'axios';
import { Transaction } from '@solana/web3.js';

function CreatePage() {
  const [formData, setFormData] = useState({
    building_name: '',
    coordinates: '',
    floor: '',
    sqm: '',
    cost: '',
    description: '',
    youtube_link: '',
    reference: '',
    payment_network: 'solana',
    thai_only: false,
    has_pool: false,
    has_parking: false,
    is_top_floor: false,
    six_months: false,
    promo_code: ''
  });

  const [references, setReferences] = useState({
    solana: '',
    aptos: '',
    sui: '',
    base: ''
  });

  useEffect(() => {
    // Generate references for all networks
    const solanaKeypair = Keypair.generate();
    const aptosRef = generateReference('aptos');
    const suiRef = generateReference('sui');
    const baseRef = generateReference('base');
    
    setReferences({
      solana: solanaKeypair.publicKey.toBase58(),
      aptos: aptosRef,
      sui: suiRef,
      base: baseRef
    });

    setFormData(prev => ({ ...prev, reference: solanaKeypair.publicKey.toBase58() }));
  }, []);

  const generateReference = (network) => {
    // Generate a random 32-byte reference for any network
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hexString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Add 0x prefix for Base (EVM-compatible) networks
    return network === 'base' ? '0x' + hexString : hexString;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value,
      reference: references[value] || prev.reference
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert string values to numbers for API
      const submitData = {
        ...formData,
        sqm: parseInt(formData.sqm) || 0,
        cost: parseInt(formData.cost) || 0
      };
      await axios.post('/api/listings', submitData);
      window.location.href = '/';
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit listing. Please try again.');
    }
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handlePayWithSolana = async () => {
    // Check if wallet is available (works on both desktop and mobile)
    if (!window.solana) {
      if (isMobile()) {
        alert('Solana wallet not detected.\n\nPlease open this page in your Phantom or Solflare wallet app\'s browser to make payments.');
      } else {
        alert('Solana wallet not detected. Please install Phantom or Solflare browser extension.');
      }
      return;
    }

    try {
      const response = await window.solana.connect();
      const payer = response.publicKey.toString();
      // Get merchant address from server config
      const configRes = await axios.get('/api/config');
      const recipient = configRes.data.recipient;
      const res = await axios.post('/api/tx/usdc', { payer, recipient, amount: 1, reference: references.solana });
      const { transaction } = res.data;
      const txBuffer = Buffer.from(transaction, 'base64');
      const tx = Transaction.from(txBuffer);
      const { signature } = await window.solana.signAndSendTransaction(tx);
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
      await connection.confirmTransaction(signature, 'confirmed');
      alert('Payment successful! Now submit the listing.');
    } catch (error) {
      alert('Payment failed: ' + error.message);
    }
  };

  const handlePayWithAptos = async () => {
    // Try all Aptos wallet providers
    const wallet = window.aptos || window.pontem || window.martian || window.fewcha;
    
    if (!wallet) {
      if (isMobile()) {
        alert('Aptos wallet not detected.\n\nPlease open this page in your Petra, Pontem, or Martian wallet app\'s browser to make payments.');
      } else {
        alert('Aptos wallet not detected. Please install Petra, Pontem, Martian, or Fewcha wallet.');
      }
      return;
    }

    try {
      const response = await wallet.connect();
      const account = await wallet.account();
      const payer = account.address;
      const res = await axios.post('/api/tx/aptos', { 
        payer, 
        amount: 1, 
        reference: references.aptos 
      });
      const { transaction } = res.data;
      const txHash = await wallet.signAndSubmitTransaction(transaction);
      alert('Payment successful! Now submit the listing.');
    } catch (error) {
      alert('Payment failed: ' + error.message);
    }
  };

  const handlePayWithSui = async () => {
    // Try all Sui wallet providers
    const wallet = window.suiWallet || window.suiet || window.ethos || window.martian?.sui;
    
    if (!wallet) {
      if (isMobile()) {
        alert('Sui wallet not detected.\n\nPlease open this page in your Sui Wallet, Suiet, or Ethos wallet app\'s browser to make payments.');
      } else {
        alert('Sui wallet not detected. Please install Sui Wallet, Suiet, Ethos, or Martian wallet.');
      }
      return;
    }

    try {
      const response = await wallet.connect();
      const payer = response.accounts[0].address;
      const res = await axios.post('/api/tx/sui', { 
        payer, 
        amount: 1, 
        reference: references.sui 
      });
      const { transaction } = res.data;
      const txHash = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: transaction,
        account: response.accounts[0]
      });
      alert('Payment successful! Now submit the listing.');
    } catch (error) {
      alert('Payment failed: ' + error.message);
    }
  };

  const handlePayWithBase = async () => {
    if (!window.ethereum) {
      if (isMobile()) {
        alert('Ethereum wallet not detected.\n\nPlease open this page in your MetaMask, Coinbase Wallet, or Rainbow wallet app\'s browser to make payments.');
      } else {
        alert('Ethereum wallet not detected. Please install MetaMask, Coinbase Wallet, or similar wallet.');
      }
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const payer = accounts[0];
      
      // Switch to Base network if not already on it
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base mainnet chain ID
        });
      } catch (switchError) {
        // If Base network is not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              rpcUrls: ['https://mainnet.base.org'],
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        }
      }
      
      const res = await axios.post('/api/tx/base', { 
        payer, 
        amount: 1, 
        reference: references.base 
      });
      const { transaction } = res.data;
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction]
      });
      alert('Payment successful! Now submit the listing.');
    } catch (error) {
      alert('Payment failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">Create New Listing / สร้างรายการใหม่</h1>
          <p className="text-sm md:text-base text-gray-600">List your property on SOI Pattaya / รายการอสังหาริมทรัพย์ของคุณใน SOI Pattaya</p>
          
          {/* Pricing Info */}
          <div className="mt-4 inline-block bg-white border-2 border-gray-200 rounded-lg px-6 py-3 shadow-sm">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">💰 Crypto:</span> $1 USD per listing | 
              <span className="font-semibold ml-2">🇹🇭 ScanPay:</span> 30 Baht per listing
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 md:p-8">
            {/* Property Details Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">1</span>
                Property Details / รายละเอียดอสังหาริมทรัพย์
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Building Name / ชื่ออาคาร *
                  </label>
                  <input
                    type="text"
                    name="building_name"
                    value={formData.building_name}
                    onChange={handleChange}
                    placeholder="เช่น Central Pattaya"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Floor / ชั้น *
                  </label>
                  <input
                    type="text"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    placeholder="เช่น ชั้น 5"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Size (sqm) / ขนาด (ตร.ม.) *
                  </label>
                  <input
                    type="number"
                    name="sqm"
                    value={formData.sqm}
                    onChange={handleChange}
                    placeholder="เช่น 120"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cost (THB) / ราคา (บาท) *
                  </label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleChange}
                    placeholder="เช่น 50000"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Coordinates (lat,lng) / พิกัด *
                  </label>
                  <input
                    type="text"
                    name="coordinates"
                    value={formData.coordinates}
                    onChange={handleChange}
                    placeholder="12.934053,100.882455"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    required
                  />
                  <p className="text-xs text-gray-500">Get coordinates from Google Maps</p>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">2</span>
                Property Information / ข้อมูลอสังหาริมทรัพย์
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description / คำอธิบาย *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your property, amenities, and key features..."
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-base"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="has_pool"
                      checked={formData.has_pool}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>Pool / สระว่ายน้ำ</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="has_parking"
                      checked={formData.has_parking}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>Parking / ที่จอดรถ</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="is_top_floor"
                      checked={formData.is_top_floor}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>Top Floor / ชั้นบนสุด</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="six_months"
                      checked={formData.six_months}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>6-month rental / เช่า 6 เดือน</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="thai_only"
                      checked={formData.thai_only}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>ไทยช่วยไทย</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    YouTube Video Link / ลิงก์วิดีโอ *
                  </label>
                  <input
                    type="url"
                    name="youtube_link"
                    value={formData.youtube_link}
                    onChange={handleChange}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    required
                  />
                  <p className="text-xs text-gray-500">อัปโหลดวิดีโอทัวร์อสังหาริมทรัพย์ไปยัง YouTube และวางลิงก์ที่นี่ / Upload a property tour video to YouTube and paste the link here</p>
                </div>
                
                {/* Promo code */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Promo Code / รหัสโปรโมชั่น</label>
                  <input
                    type="text"
                    name="promo_code"
                    value={formData.promo_code}
                    onChange={handleChange}
                    placeholder="Enter promo code"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                  />
                  <p className="text-xs text-gray-500">หากถูกต้องและมีอยู่ รหัสโปรโมชั่นจะข้ามการชำระเงิน / If valid and available, promo skips payment.</p>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">3</span>
                Payment Method / วิธีการชำระเงิน
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl border border-blue-200">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Choose Payment Network / เลือกเครือข่ายการชำระเงิน *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <label className={`relative cursor-pointer ${formData.payment_network === 'solana' ? 'ring-2 ring-purple-500' : ''}`}>
                        <input
                          type="radio"
                          name="payment_network"
                          value="solana"
                          checked={formData.payment_network === 'solana'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${formData.payment_network === 'solana' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                          <div className="text-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-teal-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">S</span>
                            </div>
                            <div className="font-medium text-gray-800">Solana</div>
                            <div className="text-xs text-gray-500">USDC</div>
                          </div>
                        </div>
                      </label>

                      <label className={`relative cursor-pointer ${formData.payment_network === 'aptos' ? 'ring-2 ring-gray-500' : ''}`}>
                        <input
                          type="radio"
                          name="payment_network"
                          value="aptos"
                          checked={formData.payment_network === 'aptos'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${formData.payment_network === 'aptos' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'}`}>
                          <div className="text-center">
                            <div className="w-8 h-8 bg-gray-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <span className="text-cyan-400 font-bold text-sm">A</span>
                            </div>
                            <div className="font-medium text-gray-800">Aptos</div>
                            <div className="text-xs text-gray-500">USDC</div>
                          </div>
                        </div>
                      </label>

                      <label className={`relative cursor-pointer ${formData.payment_network === 'sui' ? 'ring-2 ring-sky-500' : ''}`}>
                        <input
                          type="radio"
                          name="payment_network"
                          value="sui"
                          checked={formData.payment_network === 'sui'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${formData.payment_network === 'sui' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <div className="text-center">
                            <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{backgroundColor: '#4DA2FF'}}>
                              <span className="text-white font-bold text-sm">S</span>
                            </div>
                            <div className="font-medium text-gray-800">Sui</div>
                            <div className="text-xs text-gray-500">USDC</div>
                          </div>
                        </div>
                      </label>

                      <label className={`relative cursor-pointer ${formData.payment_network === 'base' ? 'ring-2 ring-blue-500' : ''}`}>
                        <input
                          type="radio"
                          name="payment_network"
                          value="base"
                          checked={formData.payment_network === 'base'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${formData.payment_network === 'base' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <div className="text-center">
                            <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{backgroundColor: '#0052FF'}}>
                              <span className="text-white font-bold text-sm">B</span>
                            </div>
                            <div className="font-medium text-gray-800">Base</div>
                            <div className="text-xs text-gray-500">USDC</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <div className="mt-6">
                    {formData.payment_network === 'solana' && (
                      <button
                        type="button"
                        onClick={handlePayWithSolana}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 md:px-6 py-3 md:py-4 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-105 shadow-lg text-sm md:text-base"
                      >
                        💳 Pay with Solana Wallet
                      </button>
                    )}

                    {formData.payment_network === 'aptos' && (
                      <button
                        type="button"
                        onClick={handlePayWithAptos}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-3 md:py-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg text-sm md:text-base"
                      >
                        💳 Pay with Aptos Wallet
                      </button>
                    )}

                    {formData.payment_network === 'sui' && (
                      <button
                        type="button"
                        onClick={handlePayWithSui}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 md:px-6 py-3 md:py-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg text-sm md:text-base"
                      >
                        💳 Pay with Sui Wallet
                      </button>
                    )}

                    {formData.payment_network === 'base' && (
                      <button
                        type="button"
                        onClick={handlePayWithBase}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-3 md:py-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg text-sm md:text-base"
                      >
                        💳 Pay with Ethereum Wallet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-8 py-3 md:py-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg text-sm md:text-base"
              >
                🚀 Create Listing / สร้างรายการ
              </button>
              <a
                href="/"
                className="flex-1 bg-gray-100 text-gray-700 px-4 md:px-8 py-3 md:py-4 rounded-lg font-medium hover:bg-gray-200 transition-all text-center text-sm md:text-base"
              >
                Cancel / ยกเลิก
              </a>
            </div>
          </form>
        </div>

        {/* Bulk Purchase Info */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💼 Bulk Listings / รายการจำนวนมาก
          </h3>
          <p className="text-gray-700 mb-2">
            <strong>English:</strong> To buy listings in bulk and pay with ScanPay in Thai Baht, please email us:
          </p>
          <p className="text-gray-700 mb-4">
            <strong>ไทย:</strong> หากต้องการซื้อรายการจำนวนมากและชำระด้วย ScanPay ในสกุลเงินบาท กรุณาอีเมลมาที่:
          </p>
          <a 
            href="mailto:paysoipattaya@gmail.com" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            📧 paysoipattaya@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default CreatePage;
