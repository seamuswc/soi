import React, { useState, useEffect } from 'react';
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
  const [listings, setListings] = useState({});
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    axios.get('/api/listings')
      .then(response => setListings(response.data));
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="relative h-screen">
      {/* Floating Create Button */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10">
        <a href="/create" className="bg-green-500 hover:bg-green-600 text-white px-3 md:px-4 py-2 md:py-2 rounded-lg shadow-lg transition-colors text-sm md:text-base">
          Create New Listing
        </a>
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
          >
            {selectedBuilding && (
              <Marker
                position={{ lat: selectedBuilding.latitude, lng: selectedBuilding.longitude }}
                title={selectedBuilding.building_name}
              />
            )}
          </GoogleMap>
        </LoadScript>
      )}
    </div>
  );
}

export default MapPage;
