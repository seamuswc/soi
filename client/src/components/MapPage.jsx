import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';

const containerStyle = {
  width: '100%',
  height: '100vh'
};

const center = {
  lat: 12.934053, // Pattaya center
  lng: 100.882455
};

function MapPage() {
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
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [mapError, setMapError] = useState(false);

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
    if (minSqm) params.set('minSqm', String(minSqm));
    if (maxSqm) params.set('maxSqm', String(maxSqm));
    if (minPrice) params.set('min', String(minPrice));
    if (maxPrice) params.set('max', String(maxPrice));
    setSearchParams(params);
  }, [thaiOnly, filterPool, filterParking, filterTopFloor, minSqm, maxSqm, minPrice, maxPrice, setSearchParams]);

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
          Create New Listing
        </a>
        <button
          onClick={() => setShowFilters(v => !v)}
          className="bg-white text-gray-800 border px-3 md:px-4 py-2 md:py-2 rounded-lg shadow text-sm md:text-base"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        {showFilters && (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow p-3 md:p-4 w-72 space-y-2 border">
          <div className="text-sm font-semibold mb-1">Filters / ตัวกรอง</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <input className="border rounded px-2 py-1" placeholder="Min sqm" value={minSqm} onChange={e => setMinSqm(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Max sqm" value={maxSqm} onChange={e => setMaxSqm(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Min THB" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Max THB" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <div className="space-y-1 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterPool} onChange={e => setFilterPool(e.target.checked)} /> Pool / สระว่ายน้ำ</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterParking} onChange={e => setFilterParking(e.target.checked)} /> Parking / ที่จอดรถ</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filterTopFloor} onChange={e => setFilterTopFloor(e.target.checked)} /> Top floor / ชั้นบนสุด</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={thaiOnly} onChange={e => setThaiOnly(e.target.checked)} /> ไทยช่วยไทย</label>
          </div>
          <button
            className="w-full text-sm bg-gray-100 hover:bg-gray-200 rounded px-3 py-1"
            onClick={() => { setMinSqm(''); setMaxSqm(''); setMinPrice(''); setMaxPrice(''); setFilterPool(false); setFilterParking(false); setFilterTopFloor(false); setThaiOnly(false); }}
          >
            Clear
          </button>
        </div>
        )}
      </div>

      {/* Full Screen Map */}
      {!apiKey || mapError ? (
        <div className="flex items-center justify-center h-full bg-gray-100 p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl md:text-2xl mb-4">SOI Pattaya - Real Estate Map</h2>
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
                <p><strong>Cost:</strong> {selectedBuilding.cost} THB</p>
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
            center={center}
            zoom={13}
            options={mapOptions}
          >
            {Object.values(listings).flat()
              .filter(l => (thaiOnly ? l.thai_only : true))
              .filter(l => (minSqm ? l.sqm >= Number(minSqm) : true))
              .filter(l => (maxSqm ? l.sqm <= Number(maxSqm) : true))
              .filter(l => (minPrice ? l.cost >= Number(minPrice) : true))
              .filter(l => (maxPrice ? l.cost <= Number(maxPrice) : true))
              .filter(l => (filterPool ? l.has_pool : true))
              .filter(l => (filterParking ? l.has_parking : true))
              .filter(l => (filterTopFloor ? l.is_top_floor : true))
              .map((l, idx) => (
                <Marker
                  key={idx}
                  position={{ lat: l.latitude, lng: l.longitude }}
                  title={l.building_name}
                  onClick={() => setSelectedBuilding(l)}
                />
              ))}
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
            {open ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>
    </div>
  );
}
