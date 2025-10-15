const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock analytics data
const mockAnalyticsData = {
  averageRent: 15420,
  pricePerSqm: 342,
  totalListings: 127,
  newListings: 23,
  rentChange: 8.2,
  sqmChange: 5.7,
  marketActivity: 'High',
  avgDaysOnMarket: 18,
  areaData: [
    { name: 'Central', listings: 38, avgPrice: 18500, change: 12.3 },
    { name: 'North', listings: 32, avgPrice: 13900, change: 7.8 },
    { name: 'South', listings: 25, avgPrice: 16950, change: 9.2 },
    { name: 'East', listings: 19, avgPrice: 12300, change: 4.1 },
    { name: 'West', listings: 13, avgPrice: 14200, change: -2.3 }
  ],
  topAreas: [
    { name: 'Central', growth: 12.3 },
    { name: 'South', growth: 9.2 },
    { name: 'North', growth: 7.8 }
  ],
  priceRanges: [
    { label: 'Under 10k', count: 25, percentage: 20 },
    { label: '10k-20k', count: 51, percentage: 40 },
    { label: '20k-30k', count: 32, percentage: 25 },
    { label: '30k+', count: 19, percentage: 15 }
  ],
  predictions: {
    shortTerm: '+2.5%',
    mediumTerm: '+5.2%',
    longTerm: '+8.7%'
  }
};

// Analytics API endpoint
app.get('/api/analytics/data', (req, res) => {
  console.log('📊 Analytics data requested');
  res.json(mockAnalyticsData);
});

// Serve the test HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-data.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Test Analytics Server running on http://localhost:${PORT}`);
  console.log(`📊 View analytics dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/analytics/data`);
});
