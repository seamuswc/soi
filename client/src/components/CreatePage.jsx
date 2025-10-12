import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentQRModal from './PaymentQRModal';
import { Keypair } from '@solana/web3.js';

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

  const [merchantAddresses, setMerchantAddresses] = useState({
    solana: '',
    lineAccount: '@soipattaya'
  });

  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    // Generate Solana reference as a valid PublicKey (base58 string)
    const solanaRef = Keypair.generate().publicKey.toBase58();
    
    setFormData(prev => ({ ...prev, reference: solanaRef }));

    // Fetch merchant addresses from server
    fetchMerchantAddresses();
  }, []);

  const fetchMerchantAddresses = async () => {
    try {
      const response = await axios.get('/api/config/merchant-addresses');
      setMerchantAddresses(response.data);
    } catch (error) {
      console.error('Failed to fetch merchant addresses:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePayment = () => {
    if (formData.payment_network === 'thb') {
      // Just open LINE chat for discussion - no pre-filled message
      const lineAccount = merchantAddresses.lineAccount || '@soipattaya';
      window.open(`https://line.me/R/ti/p/${lineAccount}`, '_blank');
    } else {
      // Show Solana Pay QR modal
      setShowQRModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowQRModal(false);
    // Redirect to home after successful payment and listing creation
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl md:text-3xl font-bold text-blue-600 hover:text-blue-800">soiPattaya</a>
            <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">← Back to Map</a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Property Details Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">1</span>
                Property Details / รายละเอียดอสังหาริมทรัพย์
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Building Name / ชื่ออาคาร *
                  </label>
                  <input
                    type="text"
                    name="building_name"
                    value={formData.building_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., View Talay 1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinates (Latitude, Longitude) / พิกัด *
                  </label>
                  <input
                    type="text"
                    name="coordinates"
                    value={formData.coordinates}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 12.9236, 100.8825"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Get coordinates from Google Maps</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Floor / ชั้น *
                    </label>
                    <input
                      type="text"
                      name="floor"
                      value={formData.floor}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size (sqm) / ขนาด *
                    </label>
                    <input
                      type="number"
                      name="sqm"
                      value={formData.sqm}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 45"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (Baht) / ราคา *
                    </label>
                    <input
                      type="number"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 8000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description / คำอธิบาย *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your property..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Video Link / ลิงก์วิดีโอ YouTube *
                  </label>
                  <input
                    type="url"
                    name="youtube_link"
                    value={formData.youtube_link}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </div>

                {/* Property Features */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    <span>Top floor / ชั้นบนสุด</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="six_months"
                      checked={formData.six_months}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>6-month rental</span>
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
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">2</span>
                Promo Code (Optional) / รหัสโปรโมชั่น
              </h2>
              
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 md:p-6 rounded-xl border border-yellow-200">
                <input
                  type="text"
                  name="promo_code"
                  value={formData.promo_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter promo code to list for free"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Have a promo code? Enter it to skip payment
                </p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Solana Option */}
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
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">◎</span>
                            </div>
                            <div className="font-medium text-gray-800">Solana</div>
                            <div className="text-xs text-gray-500">1 USDC</div>
                          </div>
                        </div>
                      </label>

                      {/* LINE/THB Option */}
                      <label className={`relative cursor-pointer ${formData.payment_network === 'thb' ? 'ring-2 ring-green-500' : ''}`}>
                        <input
                          type="radio"
                          name="payment_network"
                          value="thb"
                          checked={formData.payment_network === 'thb'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${formData.payment_network === 'thb' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                          <div className="text-center">
                            <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">฿</span>
                            </div>
                            <div className="font-medium text-gray-800">Scan Pay</div>
                            <div className="text-xs text-gray-500">35 ฿</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handlePayment}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      {formData.payment_network === 'thb' ? '💬 Open LINE Chat' : '💳 Pay with Solana'}
                    </button>
                    {formData.payment_network === 'thb' && (
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        Opens LINE chat to discuss payment details
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* Payment QR Modal */}
      {showQRModal && formData.payment_network === 'solana' && (
        <PaymentQRModal
          network={formData.payment_network}
          amount={1}
          reference={formData.reference}
          merchantAddress={merchantAddresses.solana}
          listingData={{
            ...formData,
            sqm: parseInt(formData.sqm) || 0,
            cost: parseInt(formData.cost) || 0
          }}
          onClose={() => setShowQRModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default CreatePage;
