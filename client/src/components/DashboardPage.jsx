import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginPage from './LoginPage';
import { getDomainConfig } from '../utils/domainConfig';

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [generatedPromo, setGeneratedPromo] = useState(null);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [promoList, setPromoList] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    deepseekApiKey: '',
    emailSecretId: '',
    emailSecretKey: '',
    emailRegion: 'ap-singapore',
    emailSender: 'data@soipattaya.com',
    googleMapsApiKey: '',
    solanaMerchantAddress: '',
    tencentSesTemplateIdEn: '',
    tencentSesTemplateIdPromo: '',
    adminUsername: 'admin',
    adminPassword: 'password',
    adminToken: 'admin123'
  });
  const [currentSettings, setCurrentSettings] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Get domain-specific configuration
  const domainConfig = getDomainConfig();

  useEffect(() => {
    if (token) {
      // Verify token is still valid and fetch data
      Promise.all([
        axios.get('/api/listings/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/promo/list', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/maintenance/status')
      ])
      .then(([dashboardResponse, promoResponse, maintenanceResponse]) => {
        setDashboardData(dashboardResponse.data);
        setPromoList(promoResponse.data.promos);
        setMaintenanceMode(maintenanceResponse.data.enabled);
        setIsAuthenticated(true);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          setToken(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      });
      
      // Fetch current settings
      fetchCurrentSettings();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setIsAuthenticated(true);
    localStorage.setItem('admin_token', newToken);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
      setShowUsers(true);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error fetching users');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsAuthenticated(false);
    setDashboardData(null);
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchCurrentSettings = async () => {
    try {
      const response = await axios.get('/api/settings/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentSettings(response.data);
      setSettingsForm(response.data);
    } catch (error) {
      console.error('Error fetching current settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await axios.post('/api/settings/update', settingsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings saved successfully! Server will restart to apply changes.');
      setShowSettings(false);
      fetchCurrentSettings(); // Refresh current settings
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const startMaintenance = async () => {
    try {
      await axios.post('/api/maintenance/start', {
        message: 'Maintenance underway, please dont make payments or listings. Thank you for your patience. / กำลังบำรุงรักษา กรุณาอย่าทำการชำระเงินหรือลงประกาศ ขอขอบคุณสำหรับความอดทน'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Maintenance mode activated! Users will see the maintenance message.');
      setMaintenanceMode(true);
    } catch (error) {
      console.error('Error starting maintenance:', error);
      alert('Error starting maintenance mode');
    }
  };

  const stopMaintenance = async () => {
    try {
      await axios.post('/api/maintenance/stop', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Maintenance mode deactivated.');
      setMaintenanceMode(false);
    } catch (error) {
      console.error('Error stopping maintenance:', error);
      alert('Error stopping maintenance mode');
    }
  };

  const generatePromoCode = async () => {
    // Validate input before generating
    const usesValue = parseInt(maxUses);
    if (!maxUses || isNaN(usesValue) || usesValue < 1) {
      alert(`Please enter a valid number of uses (minimum 1). Current value: "${maxUses}"`);
      return;
    }
    
    setGeneratingPromo(true);
    try {
      const response = await axios.post('/api/promo/generate', 
        { max_uses: usesValue },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setGeneratedPromo(response.data);
      
      // Refresh promo list
      const promoResponse = await axios.get('/api/promo/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPromoList(promoResponse.data.promos);
    } catch (error) {
      console.error('Error generating promo code:', error);
      alert('Failed to generate promo code');
    } finally {
      setGeneratingPromo(false);
    }
  };

  const copyPromoCode = () => {
    navigator.clipboard.writeText(generatedPromo.code);
    alert('✅ Promo code copied to clipboard!');
  };

  const deletePromoCode = async (promoId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) {
      return;
    }

    try {
      await axios.delete(`/api/promo/${promoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh promo list
      const response = await axios.get('/api/promo/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPromoList(response.data.promos);
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Failed to delete promo code');
    }
  };

  const createFreePromo = async () => {
    if (!window.confirm('Create FREE promo code with 1000 uses?')) {
      return;
    }

    try {
      await axios.post('/api/promo/create-free', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh promo list
      const response = await axios.get('/api/promo/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPromoList(response.data.promos);
      alert('✅ FREE promo code created successfully!');
    } catch (error) {
      console.error('Error creating FREE promo:', error);
      alert('Failed to create FREE promo code');
    }
  };

  // Email functionality removed

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Error loading dashboard data</div>
      </div>
    );
  }

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/listings/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const deleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/listings/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh dashboard data
      fetchDashboardData();
      alert('Listing deleted successfully!');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
    }
  };

  const getTimeUntilExpiry = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day';
    } else if (diffDays < 30) {
      return `${diffDays} days`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{domainConfig.siteName} Admin Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={fetchUsers} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base flex items-center">
              👥 View Users
            </button>
            <button onClick={createFreePromo} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg text-sm md:text-base flex items-center">
              🆓 Create FREE Promo
            </button>
            <button onClick={() => setShowSettings(true)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base flex items-center">
              ⚙️ Settings
            </button>
            <button onClick={maintenanceMode ? stopMaintenance : startMaintenance} className={`${maintenanceMode ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base flex items-center`}>
              🔧 {maintenanceMode ? 'Stop Maintenance' : 'Start Maintenance'}
            </button>
            <a href="/data" className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base flex items-center">
              📊 Data Analytics
            </a>
            <a href="/" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base">
              Back to Map
            </a>
            <a href="/create" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base">
              Create Listing
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Email functionality removed */}

        {/* Promo Code Generator */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 mb-6 md:mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🎟️ Generate Promo Code</h2>
          <p className="text-sm text-gray-600 mb-4">
            For customers who paid via ScanPay (Thai Bank Transfer). Generate a promo code and send it via LINE.
          </p>
          
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Uses
              </label>
              <input
                type="text"
                max="1000"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="1"
              />
            </div>
            <button
              onClick={generatePromoCode}
              disabled={generatingPromo}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              {generatingPromo ? 'Generating...' : '+ Generate Code'}
            </button>
          </div>
          

          {generatedPromo && (
            <div className="mt-4 bg-white border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">
                    New Promo Code ({generatedPromo.max_uses} {generatedPromo.max_uses === 1 ? 'use' : 'uses'}):
                  </p>
                  <p className="text-2xl font-mono font-bold text-gray-800 break-all">{generatedPromo.code}</p>
                </div>
                <button
                  onClick={copyPromoCode}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  📋 Copy Code
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Send this code to the customer via LINE. They can use it on the listing form.
              </p>
            </div>
          )}
        </div>

        {/* Active Promo Codes */}
        {promoList.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 md:mb-8">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">Active Promo Codes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Uses
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {promoList.map((promo) => (
                    <tr key={promo.id} className={promo.remaining_uses === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-bold text-gray-900">{promo.code.toUpperCase()}</span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-blue-600">{promo.remaining_uses}</span>
                          {promo.remaining_uses > 0 && (
                            <span className="text-xs text-gray-500">remaining</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {promo.email || 'No email'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          promo.remaining_uses > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promo.remaining_uses > 0 ? 'Active' : 'Depleted'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => deletePromoCode(promo.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-600">Total Listings</h3>
            <p className="text-2xl md:text-3xl font-bold text-blue-600">{dashboardData.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-600">Active Listings</h3>
            <p className="text-2xl md:text-3xl font-bold text-green-600">{dashboardData.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-600">Expired Listings</h3>
            <p className="text-2xl md:text-3xl font-bold text-red-600">{dashboardData.expired}</p>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">All Listings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Building
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Floor
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size (sqm)
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent (฿)
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires In
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.listings.map((listing) => (
                  <tr key={listing.id} className={listing.is_expired ? 'bg-red-50' : ''}>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {listing.building_name}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {listing.floor}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {listing.sqm}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {listing.cost.toLocaleString()}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        listing.payment_network === 'solana' ? 'bg-purple-100 text-purple-800' :
                        listing.payment_network === 'promo' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.payment_network === 'solana' ? 'Solana' : 
                         listing.payment_network === 'promo' ? 
                           (listing.promo_code_used || 'Unknown Code') : 
                         listing.payment_network.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        listing.is_expired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {listing.is_expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={listing.is_expired ? 'text-red-600 font-semibold' : ''}>
                        {getTimeUntilExpiry(listing.expires_at)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Users Modal */}
      {showUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">👥 Data Subscribers</h2>
              <button
                onClick={() => setShowUsers(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{user.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{user.password}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{user.payment_reference}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(user.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Total Users: {users.length}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">⚙️ API Settings</h3>
            <p className="text-sm text-gray-600 mb-6">
              Update API keys and settings. Changes will be applied to the server's .env file.
            </p>
            
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DeepSeek API Key
                </label>
                <input
                  type="text"
                  name="deepseekApiKey"
                  value={settingsForm.deepseekApiKey}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tencent Email Secret ID
                </label>
                <input
                  type="text"
                  name="emailSecretId"
                  value={settingsForm.emailSecretId}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AKID..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tencent Email Secret Key
                </label>
                <input
                  type="text"
                  name="emailSecretKey"
                  value={settingsForm.emailSecretKey}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Secret key..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Region
                </label>
                <select
                  name="emailRegion"
                  value={settingsForm.emailRegion}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ap-singapore">ap-singapore</option>
                  <option value="ap-hongkong">ap-hongkong</option>
                  <option value="ap-tokyo">ap-tokyo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Sender
                </label>
                <input
                  type="email"
                  name="emailSender"
                  value={settingsForm.emailSender}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="data@soipattaya.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Maps API Key
                </label>
                <input
                  type="text"
                  name="googleMapsApiKey"
                  value={settingsForm.googleMapsApiKey}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solana Merchant Address
                </label>
                <input
                  type="text"
                  name="solanaMerchantAddress"
                  value={settingsForm.solanaMerchantAddress}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Subscription Template ID
                </label>
                <input
                  type="text"
                  name="tencentSesTemplateIdEn"
                  value={settingsForm.tencentSesTemplateIdEn}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="66908"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code Template ID
                </label>
                <input
                  type="text"
                  name="tencentSesTemplateIdPromo"
                  value={settingsForm.tencentSesTemplateIdPromo}
                  onChange={handleSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="66909"
                />
              </div>

              {/* Admin Credentials Section */}
              <div className="border-t pt-4 mt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">🔐 Admin Credentials</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Change your dashboard login credentials. These will be updated in the server's .env file.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      name="adminUsername"
                      value={settingsForm.adminUsername}
                      onChange={handleSettingsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Password
                    </label>
                    <input
                      type="password"
                      name="adminPassword"
                      value={settingsForm.adminPassword}
                      onChange={handleSettingsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Token
                    </label>
                    <input
                      type="text"
                      name="adminToken"
                      value={settingsForm.adminToken}
                      onChange={handleSettingsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin123"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This token is used for API authentication. Keep it secure!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardPage;
