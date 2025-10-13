import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginPage from './LoginPage';

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [generatedPromo, setGeneratedPromo] = useState(null);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [promoList, setPromoList] = useState([]);

  useEffect(() => {
    if (token) {
      // Verify token is still valid and fetch data
      Promise.all([
        axios.get('/api/listings/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/promo/list', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      .then(([dashboardResponse, promoResponse]) => {
        setDashboardData(dashboardResponse.data);
        setPromoList(promoResponse.data.promos);
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
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setIsAuthenticated(true);
    localStorage.setItem('admin_token', newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsAuthenticated(false);
    setDashboardData(null);
  };

  const generatePromoCode = async () => {
    setGeneratingPromo(true);
    try {
      const response = await axios.post('/api/promo/generate', 
        { max_uses: maxUses },
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

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Error loading dashboard data</div>
      </div>
    );
  }

  const deleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/listings/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh dashboard data
      fetchDashboardData();
      alert('Listing deleted successfully!');
    } catch (error) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex gap-2">
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
                type="number"
                min="1"
                max="1000"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="10"
              />
            </div>
            <button
              onClick={generatePromoCode}
              disabled={generatingPromo}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg whitespace-nowrap"
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
                    Cost (THB)
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
                        listing.payment_network === 'thb' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.payment_network === 'solana' ? 'Solana' : 
                         listing.payment_network === 'thb' ? 'Thai Baht' : 
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
    </div>
  );
}

export default DashboardPage;
