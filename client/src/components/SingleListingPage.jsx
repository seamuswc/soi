import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';

function SingleListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/listings')
      .then(response => {
        const allListings = Object.values(response.data).flat();
        const found = allListings.find(l => l.id === parseInt(id));
        setListing(found);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <button
            onClick={() => navigate('/')}
            className="mb-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            ← Back to Map / กลับไปที่แผนที่
          </button>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Listing not found / ไม่พบรายการ</h1>
            <p className="text-gray-600">This listing may no longer be available. / รายการนี้อาจไม่มีอีกต่อไป</p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(listing.expires_at) < new Date();

  // Generate SEO data
  const seoTitle = `${listing.building_name} Floor ${listing.floor} | ${listing.cost.toLocaleString()}฿/month Rental | ${listing.sqm} sqm Apartment for Rent`;
  const seoDescription = `${listing.building_name} Floor ${listing.floor} - ${listing.sqm} sqm rental unit for ${listing.cost.toLocaleString()}฿/month in Pattaya. ${listing.has_pool ? 'Swimming pool available. ' : ''}${listing.has_parking ? 'Parking available. ' : ''}${listing.is_top_floor ? 'Top floor unit. ' : ''}${listing.description.substring(0, 100)}... View this apartment, condo, or house for rent today.`;
  const seoKeywords = `${listing.building_name} floor ${listing.floor} rental, ${listing.cost.toLocaleString()}฿ apartment for rent, ${listing.sqm} sqm rental unit, ${listing.building_name} apartment for rent, ${listing.building_name} condo for rent, ${listing.building_name} house for rent, rent in ${listing.building_name}, Pattaya apartments for rent, Pattaya condos for rent, long term rental Pattaya, ${listing.building_name} unit rental, Pattaya property rental`;

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://soipattaya.com/listing/${listing.id}`} />
        <meta property="og:site_name" content="SoiPattaya Real Estate" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://soipattaya.com/listing/${listing.id}`} />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 hover:underline cursor-pointer">
                {listing.building_name} 📍
              </h1>
            </a>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 text-sm md:text-base whitespace-nowrap"
            >
              ← Back to Map / กลับไปที่แผนที่
            </button>
          </div>
          <button
            onClick={() => navigate(`/${encodeURIComponent(listing.building_name)}`)}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            View all units in this building / ดูห้องทั้งหมดในอาคารนี้
          </button>
        </div>

        {/* Single Listing Card */}
        <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
          {/* Video */}
          <div className="relative aspect-video bg-gray-900">
            <iframe 
              className="w-full h-full"
              src={listing.youtube_link.replace('watch?v=', 'embed/')} 
              title={`${listing.building_name} - Floor ${listing.floor}`}
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Floor & Status */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Floor {listing.floor} / ชั้น {listing.floor}</h2>
              {isExpired && (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                  EXPIRED / หมดอายุ
                </span>
              )}
            </div>

            {/* Price & Size */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500">Monthly Rent / ค่าเช่ารายเดือน</p>
                <p className="text-3xl font-bold text-blue-600">
                  {listing.cost.toLocaleString()}฿
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Size / ขนาด</p>
                <p className="text-2xl font-bold text-gray-800">{listing.sqm} sqm</p>
              </div>
            </div>


            {/* Description */}
            <p className="text-gray-700 mb-4 leading-relaxed">{listing.description}</p>

            {/* Features */}
            <div className="flex flex-wrap gap-2">
              {listing.has_pool && (
                <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  🏊 Pool / สระว่ายน้ำ
                </span>
              )}
              {listing.has_parking && (
                <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  🚗 Parking / ที่จอดรถ
                </span>
              )}
              {listing.is_top_floor && (
                <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  🏔️ Top Floor / ชั้นบนสุด
                </span>
              )}
              {listing.thai_only && (
                <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  🇹🇭 Thai Only / คนไทยเท่านั้น
                </span>
              )}
              {listing.six_months && (
                <span className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  📅 6-Month / สัญญา 6 เดือน
                </span>
              )}
            </div>

            {/* Footer Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Listed on / ลงประกาศ: {new Date(listing.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default SingleListingPage;

