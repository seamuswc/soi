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

  useEffect(() => {
    axios.get('/api/listings')
      .then(response => setListings(response.data));
  }, []);

  return (
    <div className="flex h-screen">
      <div className="w-1/4 overflow-y-auto p-4">
        <h1 className="text-2xl mb-4">Buildings</h1>
        {Object.keys(listings).map(building => (
          <div key={building} className="mb-4">
            <h2 className="text-xl">{building}</h2>
            {listings[building].map(listing => (
              <div key={listing.id} className="border p-2 mb-2">
                <p>Floor: {listing.floor}</p>
                <p>Size: {listing.sqm} sqm</p>
                <p>Cost: {listing.cost} THB</p>
                <button onClick={() => setSelectedBuilding(listing)} className="bg-blue-500 text-white p-1">View on Map</button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="w-3/4">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
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
      </div>
    </div>
  );
}

export default MapPage;
