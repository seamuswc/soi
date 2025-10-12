import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function DetailPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/listings/${encodeURIComponent(name)}`)
      .then(response => {
        setListings(response.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <button
            onClick={() => navigate('/')}
            className="mb-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            ← Back to Map
          </button>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">No listings found</h1>
            <p className="text-gray-600">This building doesn't have any available units.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="mb-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 text-sm md:text-base"
          >
            ← Back to Map
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{name}</h1>
          <p className="text-gray-600 text-sm md:text-base">
            {listings.length} available unit{listings.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {listings.map(listing => {
            const isExpired = new Date(listing.expires_at) < new Date();
            
            return (
              <div 
                key={listing.id} 
                className={`bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-[1.02] ${
                  isExpired ? 'opacity-60' : ''
                }`}
              >
                {/* Video */}
                <div className="relative aspect-video bg-gray-900">
                  <iframe 
                    className="w-full h-full"
                    src={listing.youtube_link.replace('watch?v=', 'embed/')} 
                    title={`${name} - Floor ${listing.floor}`}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Floor & Status */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Floor {listing.floor}</h2>
                    {isExpired && (
                      <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                        EXPIRED
                      </span>
                    )}
                  </div>

                  {/* Price & Size */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Monthly Rent</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {listing.cost.toLocaleString()}฿
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Size</p>
                      <p className="text-2xl font-bold text-gray-800">{listing.sqm} sqm</p>
                    </div>
                  </div>

                  {/* Payment Network */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                      listing.payment_network === 'solana' ? 'bg-purple-100 text-purple-800' :
                      listing.payment_network === 'thb' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {listing.payment_network === 'solana' ? '◎ Solana Pay' : 
                       listing.payment_network === 'thb' ? '฿ Thai Baht' : 
                       listing.payment_network.toUpperCase()}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 mb-4 leading-relaxed">{listing.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {listing.has_pool && (
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        🏊 Swimming Pool
                      </span>
                    )}
                    {listing.has_parking && (
                      <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        🚗 Parking
                      </span>
                    )}
                    {listing.is_top_floor && (
                      <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        🏔️ Top Floor
                      </span>
                    )}
                    {listing.thai_only && (
                      <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        🇹🇭 Thai Nationals Only
                      </span>
                    )}
                    {listing.six_months && (
                      <span className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        📅 6-Month Lease
                      </span>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Listed on {new Date(listing.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DetailPage;
