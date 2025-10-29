import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { getDomainConfig } from '../utils/domainConfig';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cityData, setCityData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [reference, setReference] = useState('');
  const [paid, setPaid] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const domainConfig = getDomainConfig();

  useEffect(() => {
    fetchCityData();
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

  const fetchCityData = async () => {
    try {
      const response = await axios.get('/api/cities/listings');
      setCityData(response.data);
    } catch (err) {
      console.error('Error fetching city data:', err);
    }
  };

  const generateReference = () => {
    // Generate a valid Solana PublicKey as reference
    const { Keypair } = require('@solana/web3.js');
    return Keypair.generate().publicKey.toBase58();
  };

  const handleRegister = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const ref = generateReference();
      setReference(ref);

      // Create Solana Pay URL for 1 USDC
      const params = new URLSearchParams({
        amount: '1',
        'spl-token': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
        reference: ref,
        label: `${domainConfig.siteName} Data Access`,
        message: 'Data Access Purchase (365 days)'
      });
      const url = `solana:${process.env.REACT_APP_SOLANA_MERCHANT_ADDRESS}?${params.toString()}`;
      setQrUrl(url);
      setShowQR(true);

      // Start polling for payment confirmation
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const r = await axios.get(`/api/payment/check/solana/${ref}`);
          if (r.data?.confirmed) {
            setPaid(true);
            setShowQR(false);
            
            // Register user after payment
            const response = await axios.post('/api/auth/register', {
              email,
              reference: ref
            });
            
            setSuccess(`Registration successful! Your password is: ${response.data.password}. Please save this password.`);
            setPassword(response.data.password);
            setIsLogin(true);
            return;
          }
        } catch {}
      }
      
      // Timeout
      setShowQR(false);
      setError('Payment timeout. If payment completed, wait a few minutes. Otherwise, try again.');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/auth/user-login', {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem('authToken', response.data.token);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = '/data';
        }, 1000);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      window.location.href = '/data';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🔐 {domainConfig.siteName} Data Access
          </h1>
          <p className="text-gray-600">
            Access premium analytics and market data
          </p>
        </div>

        {/* Maintenance Message */}
        {maintenanceMode && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
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

        {/* City Data Display */}
        {cityData && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Current Listings</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-900">{cityData.pattaya}</p>
                <p className="text-sm text-blue-700">Pattaya</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{cityData.bangkok}</p>
                <p className="text-sm text-blue-700">Bangkok</p>
              </div>
            </div>
          </div>
        )}

        {/* Toggle between Login and Register */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLogin 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isLogin 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Register (1 USDC)
          </button>
        </div>

        {/* QR Code Display */}
        {showQR && (
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Scan QR Code to Pay 1 USDC
            </h3>
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              <QRCodeSVG 
                value={qrUrl}
                size={200}
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Payment will be verified automatically
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Login Form */}
        {isLogin && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your password"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        )}

        {/* Register Form */}
        {!isLogin && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Username)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Cost:</strong> 1 USDC via Solana<br/>
                <strong>Duration:</strong> 365 days access<br/>
                <strong>Password:</strong> Generated automatically
              </p>
            </div>
            <button
              onClick={handleRegister}
              disabled={loading || showQR}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Buy Access (1 USDC)'}
            </button>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="text-center mt-6">
          <a 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
