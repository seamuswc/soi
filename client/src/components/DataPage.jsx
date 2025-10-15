import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getDomainConfig } from '../utils/domainConfig';

function DataPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [chartType, setChartType] = useState('price');
  
  const domainConfig = getDomainConfig();

  useEffect(() => {
    fetchData();
  }, [selectedArea, selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userToken = localStorage.getItem('authToken');
      const adminToken = localStorage.getItem('admin_token');
      
      if (!userToken && !adminToken) {
        window.location.href = '/auth';
        return;
      }

      const token = userToken || adminToken;
      const response = await axios.get('/api/analytics/data', {
        params: {
          area: selectedArea,
          period: selectedPeriod
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('admin_token');
        window.location.href = '/auth';
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (domainConfig.cityName === 'Bangkok') {
      return `฿${amount.toLocaleString()}`;
    } else if (domainConfig.cityName === 'Delhi') {
      return `₹${amount.toLocaleString()}`;
    } else if (domainConfig.cityName === 'Lagos') {
      return `₦${amount.toLocaleString()}`;
    }
    return `฿${amount.toLocaleString()}`;
  };

  const getAreaName = (area) => {
    if (area === 'all') return 'All Areas';
    return area.charAt(0).toUpperCase() + area.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Data Analytics</h1>
              <p className="text-sm text-gray-600">Real estate market insights for {domainConfig.cityName}</p>
            </div>
            <div className="flex space-x-4">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Areas</option>
                <option value="central">Central</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1month">1 Month</option>
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Rent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.averageRent ? formatCurrency(data.averageRent) : 'N/A'}
                </p>
                <p className={`text-sm ${data?.rentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data?.rentChange ? `${data.rentChange > 0 ? '+' : ''}${data.rentChange.toFixed(1)}%` : 'N/A'} vs last period
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Price per SQM</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.pricePerSqm ? formatCurrency(data.pricePerSqm) : 'N/A'}
                </p>
                <p className={`text-sm ${data?.sqmChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data?.sqmChange ? `${data.sqmChange > 0 ? '+' : ''}${data.sqmChange.toFixed(1)}%` : 'N/A'} vs last period
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🏠</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900">{data?.totalListings || 0}</p>
                <p className="text-sm text-gray-600">
                  {data?.newListings || 0} new this period
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Market Activity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.marketActivity || 'Low'}
                </p>
                <p className="text-sm text-gray-600">
                  {data?.avgDaysOnMarket || 0} days avg
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Price Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Price Trends</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setChartType('price')}
                  className={`px-3 py-1 rounded text-sm ${
                    chartType === 'price' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Price
                </button>
                <button
                  onClick={() => setChartType('volume')}
                  className={`px-3 py-1 rounded text-sm ${
                    chartType === 'volume' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Volume
                </button>
              </div>
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">Interactive chart would go here</p>
                <p className="text-sm text-gray-500">Price trends over {selectedPeriod}</p>
              </div>
            </div>
          </div>

          {/* Area Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Area Analysis</h3>
            <div className="space-y-4">
              {data?.areaData?.map((area, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{area.name}</p>
                    <p className="text-sm text-gray-600">{area.listings} listings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(area.avgPrice)}</p>
                    <p className={`text-sm ${area.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {area.change > 0 ? '+' : ''}{area.change.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🏘️</div>
                  <p>No area data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Market Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Performing Areas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Top Performing Areas</h3>
            <div className="space-y-3">
              {data?.topAreas?.map((area, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{area.name}</span>
                  </div>
                  <span className="text-green-600 font-semibold">+{area.growth.toFixed(1)}%</span>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </div>

          {/* Price Ranges */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Price Distribution</h3>
            <div className="space-y-3">
              {data?.priceRanges?.map((range, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{range.label}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${range.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{range.count}</span>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </div>

          {/* Market Predictions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔮 Market Outlook</h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Short Term (3 months)</p>
                <p className="text-lg font-bold text-blue-700">
                  {data?.predictions?.shortTerm || '+2.5%'} expected
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-900">Medium Term (6 months)</p>
                <p className="text-lg font-bold text-green-700">
                  {data?.predictions?.mediumTerm || '+5.2%'} expected
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-900">Long Term (1 year)</p>
                <p className="text-lg font-bold text-purple-700">
                  {data?.predictions?.longTerm || '+8.7%'} expected
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">📥 Export Data</h3>
              <p className="text-sm text-gray-600">Download comprehensive market reports</p>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                📊 Excel Report
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                📈 PDF Analysis
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                📋 Raw Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataPage;
