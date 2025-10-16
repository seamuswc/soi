import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentQRModal from './PaymentQRModal';
import { Keypair } from '@solana/web3.js';
import { getDomainConfig } from '../utils/domainConfig';

function CreatePage() {
  const [rentalType, setRentalType] = useState('living'); // 'living' or 'business'
  
  // Get domain-specific configuration
  const domainConfig = getDomainConfig();
  
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
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Generate Solana reference as a valid PublicKey (base58 string)
    const solanaRef = Keypair.generate().publicKey.toBase58();
    
    setFormData(prev => ({ ...prev, reference: solanaRef }));

    // Fetch merchant addresses from server
    fetchMerchantAddresses();
    
    // Check if FREE promo is available and auto-fill
    checkFreePromo();
  }, []);

  const checkFreePromo = async () => {
    try {
      const response = await axios.get('/api/promo/free');
      if (response.data.available) {
        setFormData(prev => ({ ...prev, promo_code: 'free' }));
      }
    } catch (error) {
      console.error('Failed to check FREE promo:', error);
    }
  };

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
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePayWithPromo = (e) => {
    // PAY WITH PROMO: Use existing promo code to create listing
    // Clear any other payment method selections and ensure promo code is set
    setFormData(prev => ({
      ...prev,
      payment_network: 'promo' // Set to promo since we're using a promo code
    }));
    
    if (!validateForm()) {
      return;
    }
    handleSubmit();
  };

  const handlePayment = (e) => {
    // BUY PROMO CODE: No form validation needed, just show promo selection
    if (formData.payment_network === 'promo') {
      e.preventDefault();
      e.stopPropagation();
      // Clear all validation errors immediately
      setValidationErrors({});
      // Show modal immediately - no form validation needed for buying promo codes
      setShowQRModal(true);
      return;
    }
    
    // SOLANA PAY 1 USDC: Validate form and show QR for 1 USDC
    if (formData.payment_network === 'solana') {
      if (!validateForm()) {
        return;
      }
      setShowQRModal(true);
      return;
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Required fields for both rental types
    if (!formData.coordinates.trim()) errors.coordinates = 'Coordinates are required';
    if (!formData.sqm || formData.sqm <= 0) errors.sqm = 'Size is required';
    if (!formData.cost || formData.cost <= 0) errors.cost = 'Price is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    
    // Living rental specific requirements
    if (rentalType === 'living') {
      if (!formData.building_name.trim()) errors.building_name = 'Building name is required';
      if (!formData.floor.trim()) errors.floor = 'Floor is required';
      if (!formData.youtube_link.trim()) errors.youtube_link = 'YouTube link is required';
    }
    
    // Business rental specific requirements
    if (rentalType === 'business') {
      if (!formData.business_photo) errors.business_photo = 'Business photo is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sqm: parseInt(formData.sqm) || 0,
          cost: parseInt(formData.cost) || 0,
          // Parse coordinates string to get latitude and longitude
          latitude: parseFloat(formData.coordinates.split(',')[0]) || 0,
          longitude: parseFloat(formData.coordinates.split(',')[1]) || 0,
          coordinates: formData.coordinates,
          rental_type: rentalType,
          // Set appropriate values for business rentals
          building_name: rentalType === 'business' ? 'Business Space' : formData.building_name,
          floor: rentalType === 'business' ? 'N/A' : formData.floor,
          youtube_link: rentalType === 'business' ? '' : formData.youtube_link,
          // Include promo code if provided
          promo_code: formData.promo_code || undefined,
        }),
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        const error = await response.json();
        console.error('Pay with promo error:', error);
      }
    } catch (error) {
      console.error('Pay with promo error:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setShowQRModal(false);
    // Redirect to home after successful payment and listing creation
    window.location.href = '/';
  };

  const handlePromoCodeSuccess = (promoCode) => {
    setShowQRModal(false);
    // Auto-fill the promo code input
    setFormData(prev => ({
      ...prev,
      promo_code: promoCode
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl md:text-3xl font-bold text-blue-600 hover:text-blue-800">{domainConfig.siteName}</a>
            <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">← Back to Map</a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Rental Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rental Type / ประเภทการเช่า
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setRentalType('living')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  rentalType === 'living' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏠 Living Rental / เช่าที่อยู่อาศัย
              </button>
              <button
                onClick={() => setRentalType('business')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  rentalType === 'business' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏢 Business Rental / เช่าทำธุรกิจ
              </button>
            </div>
          </div>
          
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            {/* Property Details Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">1</span>
                Property Details / รายละเอียดอสังหาริมทรัพย์
              </h2>
              
              <div className="space-y-4">
                {rentalType === 'living' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Building Name / ชื่ออาคาร *
                    </label>
                    <input
                      type="text"
                      name="building_name"
                      value={formData.building_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        validationErrors.building_name 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="e.g., View Talay 1"
                      required
                    />
                    {validationErrors.building_name && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.building_name}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinates (Latitude, Longitude) / พิกัด *
                  </label>
                  <input
                    type="text"
                    name="coordinates"
                    value={formData.coordinates}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.coordinates 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder={domainConfig.placeholder}
                    required
                  />
                  {validationErrors.coordinates && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.coordinates}</p>
                  )}
                  {!validationErrors.coordinates && (
                    <p className="text-xs text-gray-500 mt-1">Get coordinates from Google Maps</p>
                  )}
                </div>

                {rentalType === 'living' ? (
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
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          validationErrors.floor 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="e.g., 5"
                        required
                      />
                      {validationErrors.floor && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.floor}</p>
                      )}
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
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          validationErrors.sqm 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="e.g., 45"
                        required
                      />
                      {validationErrors.sqm && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.sqm}</p>
                      )}
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
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          validationErrors.cost 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="e.g., 8000"
                        required
                      />
                      {validationErrors.cost && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.cost}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size (sqm) / ขนาด *
                      </label>
                      <input
                        type="number"
                        name="sqm"
                        value={formData.sqm}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          validationErrors.sqm 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-green-500'
                        }`}
                        placeholder="e.g., 45"
                        required
                      />
                      {validationErrors.sqm && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.sqm}</p>
                      )}
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
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          validationErrors.cost 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-green-500'
                        }`}
                        placeholder="e.g., 8000"
                        required
                      />
                      {validationErrors.cost && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.cost}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description / คำอธิบาย *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.description 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Describe your property..."
                    required
                  />
                  {validationErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.description}</p>
                  )}
                </div>

                {rentalType === 'living' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Video Link / ลิงก์วิดีโอ YouTube *
                    </label>
                    <input
                      type="url"
                      name="youtube_link"
                      value={formData.youtube_link}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        validationErrors.youtube_link 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                    {validationErrors.youtube_link && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.youtube_link}</p>
                    )}
                  </div>
                )}

                {rentalType === 'business' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Photo / รูปภาพธุรกิจ *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          // Convert to base64 for now, in production you'd upload to server
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setFormData(prev => ({ ...prev, business_photo: e.target.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        validationErrors.business_photo 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-green-500'
                      }`}
                      required
                    />
                    {validationErrors.business_photo && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.business_photo}</p>
                    )}
                    {!validationErrors.business_photo && (
                      <p className="text-xs text-gray-500 mt-1">Upload a photo of your business space</p>
                    )}
                  </div>
                )}

                {/* Property Features - Only for Living Rental */}
                {rentalType === 'living' && (
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
                )}
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">2</span>
                Promo Code (Optional) / รหัสโปรโมชั่น
              </h2>
              
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 md:p-6 rounded-xl border border-yellow-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    name="promo_code"
                    value={formData.promo_code}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Enter promo code to list for free"
                  />
                  {formData.promo_code && (
                    <button
                      type="button"
                      onClick={handlePayWithPromo}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg text-sm md:text-base"
                    >
                      🎟️ Pay with Promo
                    </button>
                  )}
                </div>
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

                      {/* Buy Promo Code with Solana Option */}
                      <label className={`relative cursor-pointer ${formData.payment_network === 'promo' ? 'ring-2 ring-green-500' : ''}`}>
                        <input
                          type="radio"
                          name="payment_network"
                          value="promo"
                          checked={formData.payment_network === 'promo'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${formData.payment_network === 'promo' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                          <div className="text-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">◎</span>
                            </div>
                            <div className="font-medium text-gray-800">Buy Promo Code</div>
                            <div className="text-xs text-gray-500">1 USDC per code</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <div className="mt-6">
                    <button
                      type={formData.payment_network === 'promo' ? 'button' : 'submit'}
                      onClick={(e) => {
                        if (formData.payment_network === 'promo') {
                          e.preventDefault();
                          e.stopPropagation();
                          setValidationErrors({});
                          setShowQRModal(true);
                        } else {
                          handlePayment(e);
                        }
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      {formData.payment_network === 'promo' ? '🎟️ Buy Promo Code with Solana' : '💳 Pay with Solana'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* Payment QR Modal */}
      {showQRModal && (formData.payment_network === 'solana' || formData.payment_network === 'promo') && (
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
          onSuccess={formData.payment_network === 'promo' ? handlePromoCodeSuccess : handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default CreatePage;
