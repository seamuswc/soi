import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentQRModal from './PaymentQRModal';
import { Keypair } from '@solana/web3.js';
import { getDomainConfig } from '../utils/domainConfig';

function CreatePage() {
  const [rentalType, setRentalType] = useState('living'); // 'living' or 'business'
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
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
  const [showCoordinateModal, setShowCoordinateModal] = useState(false);
  const [existingBuildings, setExistingBuildings] = useState([]);
  const [selectedBuildingName, setSelectedBuildingName] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResults, setTranslationResults] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    // Generate Solana reference as a valid PublicKey (base58 string)
    const solanaRef = Keypair.generate().publicKey.toBase58();
    
    setFormData(prev => ({ ...prev, reference: solanaRef }));

    // Fetch merchant addresses from server
    fetchMerchantAddresses();
    
    // Check if FREE promo is available and auto-fill
    checkFreePromo();
    
    // Check maintenance status
    checkMaintenanceStatus();
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      const response = await axios.get('/api/maintenance/status');
      setMaintenanceMode(response.data.enabled);
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
    }
  };

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

  const handleChange = async (e) => {
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

    // Check for existing buildings when coordinates change
    if (name === 'coordinates' && value.trim()) {
      await checkExistingBuildings(value);
    }
  };

  // Check for existing buildings at the same coordinates
  const checkExistingBuildings = async (coordinates) => {
    try {
      const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
      if (isNaN(lat) || isNaN(lng)) return;

      const response = await axios.get('/api/listings');
      const allListings = Object.values(response.data).flat();
      
      // Find listings with similar coordinates (within ~10 meters)
      const existingBuildings = allListings.filter(listing => {
        const latDiff = Math.abs(listing.latitude - lat);
        const lngDiff = Math.abs(listing.longitude - lng);
        return latDiff < 0.0001 && lngDiff < 0.0001; // ~10 meters tolerance
      });

      if (existingBuildings.length > 0) {
        const uniqueBuildings = [...new Set(existingBuildings.map(l => l.building_name))];
        setExistingBuildings(uniqueBuildings);
        setShowCoordinateModal(true);
        return true; // Found existing buildings
      }
    } catch (error) {
      console.error('Error checking existing buildings:', error);
    }
    return false; // No existing buildings found
  };

  // Handle coordinate modal actions
  const handleUseExistingBuilding = (buildingName) => {
    setFormData(prev => ({
      ...prev,
      building_name: buildingName
    }));
    setShowCoordinateModal(false);
    setSelectedBuildingName(buildingName);
  };

  const handleUseNewBuildingName = () => {
    setShowCoordinateModal(false);
    setSelectedBuildingName('');
  };

  const translateDescription = async (targetLanguage) => {
    if (!formData.description.trim()) {
      // Show a subtle notification instead of alert
      setTranslationResults(prev => ({
        ...prev,
        [targetLanguage]: 'Please enter a description first'
      }));
      return;
    }

    // Check if description is too long (over 1000 characters)
    if (formData.description.length > 1000) {
      setTranslationResults(prev => ({
        ...prev,
        [targetLanguage]: 'Description too long (max 1000 characters)'
      }));
      return;
    }

    setIsTranslating(true);
    
    // Show loading state for this specific language
    setTranslationResults(prev => ({
      ...prev,
      [targetLanguage]: '🔄 Translating...'
    }));

    try {
      // Set a timeout for the translation request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await axios.post('/api/translate', {
        text: formData.description,
        target_language: targetLanguage
      }, {
        signal: controller.signal,
        timeout: 30000 // 30 second timeout
      });
      
      clearTimeout(timeoutId);
      
      setTranslationResults(prev => ({
        ...prev,
        [targetLanguage]: response.data.translated_text
      }));
    } catch (error) {
      console.error('Translation error:', error);
      
      // Handle different types of errors with user-friendly messages
      let errorMessage = 'Translation failed';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = '⏰ Timeout - try again or shorter text';
      } else if (error.response?.status === 413) {
        errorMessage = '📝 Text too long - please shorten';
      } else if (error.response?.status === 429) {
        errorMessage = '🚫 Too many requests - wait a moment';
      } else if (error.response?.status >= 500) {
        errorMessage = '🔧 Service unavailable - try later';
      } else {
        errorMessage = '❌ Failed - try again';
      }
      
      setTranslationResults(prev => ({
        ...prev,
        [targetLanguage]: errorMessage
      }));
    } finally {
      setIsTranslating(false);
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
    // Show success modal instead of redirecting
    setShowSuccessModal(true);
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

      {/* Maintenance Message */}
      {maintenanceMode && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-500 text-xl">🔧</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Maintenance underway, please dont make payments or listings. Thank you for your patience.</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                <strong>กำลังบำรุงรักษา กรุณาอย่าทำการชำระเงินหรือลงประกาศ ขอขอบคุณสำหรับความอดทน</strong>
              </p>
            </div>
          </div>
        </div>
      )}

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
                  
                  {/* Translation Buttons */}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => translateDescription('thai')}
                        disabled={isTranslating}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        🇹🇭 Thai
                      </button>
                      <button
                        type="button"
                        onClick={() => translateDescription('english')}
                        disabled={isTranslating}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        🇺🇸 English
                      </button>
                      <button
                        type="button"
                        onClick={() => translateDescription('chinese')}
                        disabled={isTranslating}
                        className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                      >
                        🇨🇳 Chinese
                      </button>
                      <button
                        type="button"
                        onClick={() => translateDescription('russian')}
                        disabled={isTranslating}
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        🇷🇺 Russian
                      </button>
                      <button
                        type="button"
                        onClick={() => translateDescription('korean')}
                        disabled={isTranslating}
                        className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                      >
                        🇰🇷 Korean
                      </button>
                    </div>
                    
                    {isTranslating && (
                      <div className="text-sm text-gray-600 mb-2">
                        🔄 Translating...
                      </div>
                    )}
                    
                    {/* Display Translation Results */}
                    {Object.keys(translationResults).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium text-gray-700">Translations:</h4>
                          <button
                            type="button"
                            onClick={() => setTranslationResults({})}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Clear all
                          </button>
                        </div>
                        {Object.entries(translationResults).map(([lang, text]) => (
                          <div key={lang} className="p-2 bg-gray-50 rounded text-sm border-l-2 border-blue-200 flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-medium capitalize text-blue-700">{lang}:</span> 
                              <span className="ml-2">{text}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(text);
                                // Show brief feedback
                                const btn = event.target;
                                const originalText = btn.textContent;
                                btn.textContent = '✓ Copied!';
                                btn.className = 'ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors';
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                  btn.className = 'ml-2 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors';
                                }, 1500);
                              }}
                              className="ml-2 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                              📋 Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
          Pay / จ่าย
        </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Have a promo code? Enter it to skip payment / มีรหัสโปรโมชั่น? ใส่เพื่อข้ามการชำระเงิน
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

      {/* Coordinate Conflict Modal */}
      {showCoordinateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📍 Building Name Conflict</h3>
            <p className="text-gray-600 mb-4">
              We found existing buildings at these coordinates. Would you like to:
            </p>
            
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Use existing building name:</div>
              {existingBuildings.map((buildingName, index) => (
                <button
                  key={index}
                  onClick={() => handleUseExistingBuilding(buildingName)}
                  className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{buildingName}</div>
                  <div className="text-sm text-gray-500">Keep existing name</div>
                </button>
              ))}
              
              <div className="border-t pt-3">
                <button
                  onClick={handleUseNewBuildingName}
                  className="w-full text-left p-3 border border-blue-300 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-blue-700">Use new building name</div>
                  <div className="text-sm text-blue-600">Enter a more accurate name</div>
                </button>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              💡 Tip: Using the same building name will group all listings together on the map
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Listing Created Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your property listing has been created and is now live on the map. 
              Thank you for using our platform!
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
              <a
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatePage;
