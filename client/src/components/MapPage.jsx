import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';
import { getDomainConfig } from '../utils/domainConfig';

const containerStyle = {
  width: '100%',
  height: '100vh'
};

function MapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState({});
  const [thaiOnly, setThaiOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minSqm, setMinSqm] = useState('');
  const [maxSqm, setMaxSqm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterPool, setFilterPool] = useState(false);
  const [filterParking, setFilterParking] = useState(false);
  const [filterTopFloor, setFilterTopFloor] = useState(false);
  const [filterSixMonths, setFilterSixMonths] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapError, setMapError] = useState(false);
  
  // Get domain-specific configuration
  const domainConfig = getDomainConfig();

  useEffect(() => {
    axios.get('/api/listings')
      .then(response => setListings(response.data));
  }, []);

  // Initialize filters from URL
  useEffect(() => {
    setThaiOnly(searchParams.get('thai') === '1');
    setFilterPool(searchParams.get('pool') === '1');
    setFilterParking(searchParams.get('parking') === '1');
    setFilterTopFloor(searchParams.get('top') === '1');
    setShowBusiness(searchParams.get('business') === '1');
    setMinSqm(searchParams.get('minSqm') || '');
    setMaxSqm(searchParams.get('maxSqm') || '');
    setMinPrice(searchParams.get('min') || '');
    setMaxPrice(searchParams.get('max') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters to URL on change
  useEffect(() => {
    const params = new URLSearchParams();
    if (thaiOnly) params.set('thai', '1');
    if (filterPool) params.set('pool', '1');
    if (filterParking) params.set('parking', '1');
    if (filterTopFloor) params.set('top', '1');
    if (showBusiness) params.set('business', '1');
    if (minSqm) params.set('minSqm', String(minSqm));
    if (maxSqm) params.set('maxSqm', String(maxSqm));
    if (minPrice) params.set('min', String(minPrice));
    if (maxPrice) params.set('max', String(maxPrice));
    setSearchParams(params);
  }, [thaiOnly, filterPool, filterParking, filterTopFloor, showBusiness, minSqm, maxSqm, minPrice, maxPrice, setSearchParams]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const mapOptions = {
    disableDefaultUI: false,
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false,
    gestureHandling: 'greedy',
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'road.local',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  return (
    <div className="relative h-screen">
      {/* Controls and Filters (top-left) */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex flex-col gap-2">
        <a href="/create" className="bg-green-500 hover:bg-green-600 text-white px-3 md:px-4 py-2 md:py-2 rounded-lg shadow-lg transition-colors text-sm md:text-base">
          Create / สร้าง
        </a>
        <button
          onClick={() => setShowFilters(v => !v)}
          className="bg-white text-gray-800 border px-3 md:px-4 py-2 md:py-2 rounded-lg shadow text-sm md:text-base"
        >
          {showFilters ? 'Hide / ซ่อน' : 'Filters / ตัวกรอง'}
        </button>
        {showFilters && (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow p-3 md:p-4 w-72 space-y-2 border">
          <div className="text-sm font-semibold mb-1">Filters / ตัวกรอง</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <input className="border rounded px-2 py-1" placeholder="Min sqm" value={minSqm} onChange={e => setMinSqm(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Max sqm" value={maxSqm} onChange={e => setMaxSqm(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Min USDC" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Max USDC" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          
          {/* Price Legend */}
          <div className="border-t pt-2 mt-2">
            <div className="text-xs font-semibold mb-1">Price Colors / สีราคา</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#3b82f6'}}></div>
                <span>Cheapest / ถูกที่สุด</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#10b981'}}></div>
                <span>Low / ต่ำ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#f59e0b'}}></div>
                <span>Medium / ปานกลาง</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#f97316'}}></div>
                <span>High / สูง</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ef4444'}}></div>
                <span>Most Expensive / แพงที่สุด</span>
              </div>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterPool} onChange={e => {
              setFilterPool(e.target.checked);
              if (e.target.checked) setShowBusiness(false);
            }} /> Pool / สระว่ายน้ำ</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterParking} onChange={e => {
              setFilterParking(e.target.checked);
              if (e.target.checked) setShowBusiness(false);
            }} /> Parking / ที่จอดรถ</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterTopFloor} onChange={e => {
              setFilterTopFloor(e.target.checked);
              if (e.target.checked) setShowBusiness(false);
            }} /> Top floor / ชั้นบนสุด</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterSixMonths} onChange={e => {
              setFilterSixMonths(e.target.checked);
              if (e.target.checked) setShowBusiness(false);
            }} /> 6-month rental</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={thaiOnly} onChange={e => {
              setThaiOnly(e.target.checked);
              if (e.target.checked) setShowBusiness(false);
            }} /> ไทยช่วยไทย</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showBusiness} onChange={e => {
              setShowBusiness(e.target.checked);
              if (e.target.checked) {
                // Clear all other filters except sqm/price when business is selected
                setFilterPool(false);
                setFilterParking(false);
                setFilterTopFloor(false);
                setFilterSixMonths(false);
                setThaiOnly(false);
              }
            }} /> 🏢 Business / ธุรกิจ</label>
          </div>
          <button
            className="w-full text-sm bg-gray-100 hover:bg-gray-200 rounded px-3 py-1"
            onClick={() => { setMinSqm(''); setMaxSqm(''); setMinPrice(''); setMaxPrice(''); setFilterPool(false); setFilterParking(false); setFilterTopFloor(false); setThaiOnly(false); setShowBusiness(false); }}
          >
            Clear / ล้าง
          </button>
        </div>
        )}
      </div>

      {/* Full Screen Map */}
      {!apiKey || mapError ? (
        <div className="flex items-center justify-center h-full bg-gray-100 p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl md:text-2xl mb-4">{domainConfig.siteName} - Real Estate Map</h2>
            <p className="mb-4 text-sm md:text-base">Google Maps integration requires an API key</p>
            <div className="bg-yellow-100 p-3 md:p-4 rounded">
              <p className="text-xs md:text-sm">To enable the map:</p>
              <p className="text-xs md:text-sm">1. Get a Google Maps API key</p>
              <p className="text-xs md:text-sm">2. Set VITE_GOOGLE_MAPS_API_KEY in .env</p>
              <p className="text-xs md:text-sm">3. Rebuild the application</p>
            </div>
            {selectedBuilding && (
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <h3 className="font-bold">Selected Property:</h3>
                <p><strong>Building:</strong> {selectedBuilding.building_name}</p>
                <p><strong>Floor:</strong> {selectedBuilding.floor}</p>
                <p><strong>Size:</strong> {selectedBuilding.sqm} sqm</p>
                <p><strong>Cost:</strong> {selectedBuilding.cost} USDC</p>
                <p><strong>Coordinates:</strong> {selectedBuilding.latitude}, {selectedBuilding.longitude}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <LoadScript 
          googleMapsApiKey={apiKey}
          onLoad={() => setMapError(false)}
          onError={() => setMapError(true)}
        >
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={domainConfig.center}
            zoom={14}
            options={mapOptions}
          >
            {(() => {
              // Filter listings
              const filteredListings = Object.values(listings).flat()
                .filter(l => (thaiOnly ? l.thai_only : true))
                .filter(l => (minSqm ? l.sqm >= Number(minSqm) : true))
                .filter(l => (maxSqm ? l.sqm <= Number(maxSqm) : true))
                .filter(l => (minPrice ? l.cost >= Number(minPrice) : true))
                .filter(l => (maxPrice ? l.cost <= Number(maxPrice) : true))
                .filter(l => (filterPool ? l.has_pool : true))
                .filter(l => (filterParking ? l.has_parking : true))
                .filter(l => (filterTopFloor ? l.is_top_floor : true))
                .filter(l => (filterSixMonths ? l.six_months : true))
                .filter(l => (showBusiness ? l.rental_type === 'business' : l.rental_type === 'living'));

              // Group by building name
              const grouped = filteredListings.reduce((acc, listing) => {
                if (!acc[listing.building_name]) {
                  acc[listing.building_name] = [];
                }
                acc[listing.building_name].push(listing);
                return acc;
              }, {});

              return Object.entries(grouped).map(([buildingName, buildingListings], index) => {
                const firstListing = buildingListings[0];
                
                // Calculate average price for color coding
                const avgPrice = buildingListings.reduce((sum, listing) => sum + listing.cost, 0) / buildingListings.length;
                
                // Get all prices to determine min/max for color scale
                const allPrices = Object.values(grouped).flat().map(listing => listing.cost);
                const minPrice = Math.min(...allPrices);
                const maxPrice = Math.max(...allPrices);
                
                // Color scale from blue (cheap) to red (expensive)
                const getMarkerColor = (price) => {
                  if (maxPrice === minPrice) return '#3b82f6'; // Blue if all same price
                  
                  const ratio = (price - minPrice) / (maxPrice - minPrice);
                  
                  if (ratio <= 0.2) return '#3b82f6'; // Blue - cheapest
                  if (ratio <= 0.4) return '#10b981'; // Green
                  if (ratio <= 0.6) return '#f59e0b'; // Yellow
                  if (ratio <= 0.8) return '#f97316'; // Orange
                  return '#ef4444'; // Red - most expensive
                };
                
                // Add very small offset to prevent marker overlap at same coordinates
                const baseLat = firstListing.latitude;
                const baseLng = firstListing.longitude;
                
                // Create consistent offset based on building name hash
                const hash = buildingName.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                
                // Much smaller offset (~2-5 meters) to keep markers very close
                const offsetLat = baseLat + ((hash % 20) - 10) * 0.00001;
                const offsetLng = baseLng + (((hash >> 8) % 20) - 10) * 0.00001;
                
                return (
                  <React.Fragment key={buildingName}>
                    <Marker
                      position={{ lat: offsetLat, lng: offsetLng }}
                      title={`${buildingName} - Avg: ${Math.round(avgPrice)} USDC`}
                      onClick={() => setSelectedMarker(buildingName)}
                      icon={{
                        path: 'M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13C19,5.13 15.87,2 12,2z',
                        fillColor: getMarkerColor(avgPrice),
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 0.8
                      }}
                    />
                    {selectedMarker === buildingName && (
                      <InfoWindow
                        position={{ lat: offsetLat, lng: offsetLng }}
                        onCloseClick={() => setSelectedMarker(null)}
                      >
                        <div className="p-2 max-w-xs">
                          <h3 
                            onClick={() => navigate(`/${encodeURIComponent(buildingName)}`)}
                            className="font-bold text-lg mb-2 cursor-pointer hover:text-blue-600 transition"
                          >
                            {buildingName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{buildingListings.length} available unit{buildingListings.length > 1 ? 's' : ''}</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {buildingListings.map((listing) => (
                              <div
                                key={listing.id}
                                onClick={() => navigate(`/listing/${listing.id}`)}
                                className="border border-gray-200 rounded p-2 hover:bg-blue-50 cursor-pointer transition"
                              >
                                <p className="font-semibold text-sm">Floor {listing.floor}</p>
                                <p className="text-xs text-gray-600">{listing.sqm} sqm • {listing.cost.toLocaleString()}฿/mo</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {listing.has_pool && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">🏊 Pool</span>}
                                  {listing.has_parking && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">🚗 Parking</span>}
                                  {listing.is_top_floor && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">🏔️ Top Floor</span>}
                                  {listing.thai_only && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">🇹🇭</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </GoogleMap>
        </LoadScript>
      )}
    </div>
  );
}

export default MapPage;

function FilterToggle({ renderPanel }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="absolute bottom-0 left-0 md:bottom-4 md:left-4 z-10 w-full md:w-auto">
      <div className={`mx-0 md:mx-0 ${open ? '' : ''}`}>
        {open && (
          <div className="md:mb-2">
            {renderPanel()}
          </div>
        )}
        <div className="flex">
          <button
            onClick={() => setOpen(o => !o)}
            className="m-2 md:m-0 bg-white text-gray-800 border px-4 py-2 rounded-lg shadow text-sm md:text-base"
          >
            {open ? 'Hide / ซ่อน' : 'Filters / ตัวกรอง'}
          </button>
        </div>
      </div>
    </div>
  );
}
