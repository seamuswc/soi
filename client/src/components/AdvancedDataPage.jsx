import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getDomainConfig } from '../utils/domainConfig';

function AdvancedDataPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [chartType, setChartType] = useState('price');
  const [currentCity, setCurrentCity] = useState(() => {
    const hostname = window.location.hostname;
    if (hostname.includes('soibkk.com')) {
      return 'bangkok';
    }
    return 'pattaya';
  });
  const [map, setMap] = useState(null);
  const [chart, setChart] = useState(null);
  
  const mapRef = useRef(null);
  const chartRef = useRef(null);
  
  const domainConfig = getDomainConfig();

  // Get city data based on current selection
  const getCityData = () => {
    if (currentCity === 'bangkok') {
      return {
        name: 'Bangkok',
        center: [13.7563, 100.5018],
        areaData: data?.areaData || []
      };
    }
    return {
      name: 'Pattaya',
      center: [12.9236, 100.8825],
      areaData: data?.areaData || []
    };
  };

  useEffect(() => {
    fetchData();
  }, [selectedArea, selectedPeriod, currentCity]);

  useEffect(() => {
    if (data) {
      // Clear existing map and chart when switching cities
      if (map) {
        map.remove();
        setMap(null);
      }
      if (chart) {
        chart.destroy();
        setChart(null);
      }
      // Re-initialize with new city data
      setTimeout(() => {
        initMap();
        initChart();
      }, 100);
    }
  }, [data, currentCity]);

  useEffect(() => {
    if (chart) {
      const labels = getChartLabels(selectedPeriod);
      chart.data.labels = labels;
      chart.data.datasets[0].data = chartType === 'price' 
        ? generatePriceData(data?.averageRent || 0, labels.length)
        : generateVolumeData(data?.totalListings || 0, labels.length);
      chart.update();
    }
  }, [selectedPeriod, chart]);

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
          period: selectedPeriod,
          city: currentCity
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

  const initMap = () => {
    if (mapRef.current) {
      const cityData = getCityData();
      const leafletMap = L.map(mapRef.current).setView(cityData.center, 11);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(leafletMap);

      // Add area markers with proportional sizes
      cityData.areaData.forEach(area => {
        const radius = Math.max(8, Math.min(25, area.listings / 2));
        L.circleMarker([area.lat || 0, area.lng || 0], {
          radius: radius,
          fillColor: '#3B82F6',
          color: '#1E40AF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7
        }).addTo(leafletMap).bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg">${area.name}</h3>
            <p class="text-sm text-gray-600">${area.listings} listings</p>
            <p class="text-sm font-semibold">Avg: ${formatCurrency(area.avgPrice)}</p>
            <p class="text-sm ${area.change >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${area.change > 0 ? '+' : ''}${area.change}%
            </p>
          </div>
        `);
      });

      setMap(leafletMap);
    }
  };

  const initChart = () => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      const labels = getChartLabels(selectedPeriod);
      const chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: chartType === 'price' ? `Average Price (THB)` : 'Listings Volume',
            data: chartType === 'price' 
              ? generatePriceData(data?.averageRent || 0, labels.length)
              : generateVolumeData(data?.totalListings || 0, labels.length),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        }
      });
      setChart(chartInstance);
    }
  };

  const generatePriceData = (basePrice, length) => {
    // For now, show flat line with current average price
    // TODO: Implement real historical data when available
    return Array(length).fill(Math.round(basePrice));
  };

  const generateVolumeData = (baseVolume, length) => {
    // For now, show flat line with current total listings
    // TODO: Implement real historical data when available
    return Array(length).fill(Math.round(baseVolume));
  };

  // Remove city switching - use domain-specific defaults

  const switchChart = (type) => {
    setChartType(type);
    if (chart) {
      chart.data.datasets[0].label = type === 'price' ? `Average Price (THB)` : 'Listings Volume';
      chart.data.datasets[0].data = type === 'price' 
        ? generatePriceData(data?.averageRent || 0, chart.data.labels.length)
        : generateVolumeData(data?.totalListings || 0, chart.data.labels.length);
      chart.update();
    }
  };

  const filterChart = (area) => {
    setSelectedArea(area);
    // Update chart data based on area filter
    if (chart && data?.areaData) {
      const areaData = data.areaData.find(a => a.name.toLowerCase() === area.toLowerCase());
      if (areaData) {
        chart.data.datasets[0].data = chartType === 'price' 
          ? [areaData.avgPrice * 0.9, areaData.avgPrice * 0.95, areaData.avgPrice, areaData.avgPrice * 1.05, areaData.avgPrice * 1.1, areaData.avgPrice * 1.08]
          : [areaData.listings * 0.8, areaData.listings * 0.9, areaData.listings, areaData.listings * 1.1, areaData.listings * 1.2, areaData.listings * 1.15];
        chart.update();
      }
    }
  };

  const downloadExcelData = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Listings sheet
    const listingsData = data?.areaData?.map(area => ({
      'Area': area.name,
      'Listings': area.listings,
      'Average Price': area.avgPrice,
      'Change %': area.change,
      'Coordinates': `${area.lat || 0}, ${area.lng || 0}`
    })) || [];
    const listingsWS = XLSX.utils.json_to_sheet(listingsData);
    XLSX.utils.book_append_sheet(wb, listingsWS, 'Listings');
    
    // Promo Codes sheet (mock data for now)
    const promoData = [
      { 'Code': 'PROMO123', 'Uses': 5, 'Max Listings': 1, 'Created': '2024-01-15' },
      { 'Code': 'SAVE50', 'Uses': 3, 'Max Listings': 2, 'Created': '2024-01-20' }
    ];
    const promoWS = XLSX.utils.json_to_sheet(promoData);
    XLSX.utils.book_append_sheet(wb, promoWS, 'Promo Codes');
    
    // Area Analysis sheet
    const analysisData = [
      { 'Metric': 'Total Listings', 'Value': data?.totalListings || 0 },
      { 'Metric': 'Average Price', 'Value': data?.averageRent || 0 },
      { 'Metric': 'Price per SQM', 'Value': data?.pricePerSqm || 0 },
    ];
    const analysisWS = XLSX.utils.json_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(wb, analysisWS, 'Area Analysis');
    
    // Download
    const cityName = getCityData().name.toLowerCase();
    XLSX.writeFile(wb, `${cityName}_analytics_data.xlsx`);
  };

  const formatCurrency = (amount) => {
    const symbol = 'THB';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getPeriodText = (period) => {
    switch (period) {
      case '1month': return 'last month';
      case '3months': return 'last 3 months';
      case '6months': return 'last 6 months';
      case '1year': return 'last year';
      case 'beginning': return 'beginning of year';
      case 'all': return 'all time';
      default: return 'last period';
    }
  };

  const getChartLabels = (period) => {
    const now = new Date();
    switch (period) {
      case '1month': 
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case '3months': 
        return ['Month 1', 'Month 2', 'Month 3'];
      case '6months': 
        // Show last 6 months with real month names
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(date.toLocaleDateString('en-US', { month: 'short' }));
        }
        return months;
      case '1year': 
        return ['Q1', 'Q2', 'Q3', 'Q4'];
      case 'beginning': 
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      case 'all': 
        return ['2020', '2021', '2022', '2023', '2024'];
      default: 
        // Show last 6 months with real month names
        const defaultMonths = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          defaultMonths.push(date.toLocaleDateString('en-US', { month: 'short' }));
        }
        return defaultMonths;
    }
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
              <p className="text-sm text-gray-600">Real estate market insights for {getCityData().name}</p>
            </div>
            <div className="flex space-x-4">
              {/* City Selector Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentCity('pattaya')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentCity === 'pattaya' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Pattaya
                </button>
                <button
                  onClick={() => setCurrentCity('bangkok')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentCity === 'bangkok' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Bangkok
                </button>
              </div>
              
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1month">1 Month</option>
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
                <option value="beginning">Beginning of Year</option>
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
                  {data?.rentChange ? `${data.rentChange > 0 ? '+' : ''}${data.rentChange.toFixed(1)}%` : 'N/A'} vs {getPeriodText(selectedPeriod)}
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
                  {data?.sqmChange ? `${data.sqmChange > 0 ? '+' : ''}${data.sqmChange.toFixed(1)}%` : 'N/A'} vs {getPeriodText(selectedPeriod)}
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
                <p className="text-2xl font-bold text-gray-900">
                  {data?.totalListings || 0}
                </p>
                <p className="text-sm text-gray-600">
                  {data?.newListings || 0} new this period
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Interactive Map and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Interactive Map */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Interactive Map</h3>
            <div className="h-80 rounded-lg overflow-hidden" ref={mapRef}></div>
            <p className="text-sm text-gray-600 mt-2">
              Circle sizes represent listing density. Click markers for area details.
            </p>
          </div>

          {/* Interactive Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">📊 Price Trends</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => switchChart('price')}
                  className={`px-3 py-1 rounded text-sm ${
                    chartType === 'price' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Price
                </button>
                <button
                  onClick={() => switchChart('volume')}
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
            <div className="h-64">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Area Analysis */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🏘️ Area Analysis</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => filterChart('all')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedArea === 'all' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                ALL
              </button>
              {data?.areaData?.map(area => (
                <button 
                  key={area.name}
                  onClick={() => filterChart(area.name)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedArea === area.name.toLowerCase() 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.areaData?.map((area, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                   onClick={() => filterChart(area.name)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{area.name}</h4>
                    <p className="text-sm text-gray-600">{area.listings} listings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(area.avgPrice)}</p>
                    <p className={`text-sm ${area.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {area.change > 0 ? '+' : ''}{area.change}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">📥 Export Data</h3>
              <p className="text-sm text-gray-600">Download comprehensive market reports</p>
            </div>
            <button 
              onClick={downloadExcelData}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              📊 Excel Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedDataPage;
