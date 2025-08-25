import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function DetailPage() {
  const { name } = useParams();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    axios.get(`/api/listings/${name}`)
      .then(response => setListings(response.data));
  }, [name]);

  return (
    <div className="p-4">
      <h1>{name}</h1>
      {listings.map(listing => (
        <div key={listing.id} className="border p-4 mb-4">
          <p>Floor: {listing.floor}</p>
          <p>Size: {listing.sqm} sqm</p>
          <p>Cost: {listing.cost} THB</p>
          <p>{listing.description}</p>
          <iframe width="560" height="315" src={listing.youtube_link.replace('watch?v=', 'embed/')} title="YouTube video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
      ))}
    </div>
  );
}

export default DetailPage;
