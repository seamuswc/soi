import React, { useState, useEffect } from 'react';
import QRious from 'qrious';
import { Keypair, PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import axios from 'axios';
import { Transaction } from '@solana/web3.js';

function CreatePage() {
  const [formData, setFormData] = useState({
    building_name: '',
    coordinates: '',
    floor: '',
    sqm: '',
    cost: '',
    description: '',
    youtube_link: '',
    reference: '',
    payment_network: 'solana'
  });

  const [solanaReference, setSolanaReference] = useState('');

  useEffect(() => {
    // Generate references
    const keypair = Keypair.generate();
    setSolanaReference(keypair.publicKey.toBase58());
    generateQRCodes(keypair.publicKey.toBase58());

    setFormData(prev => ({ ...prev, reference: keypair.publicKey.toBase58() }));
  }, []);

  const generateQRCodes = (reference) => {
    // Solana QR
    const solanaWallet = '8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj'; // From original
    const solanaQR = new QRious({
      element: document.getElementById('solana-qr'),
      value: `solana:${solanaWallet}?amount=1&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=${reference}`,
      size: 200
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/listings', formData);
      window.location.href = '/';
    } catch (error) {
      console.error(error);
    }
  };

  const handlePayWithPhantom = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      alert('Phantom wallet not detected. Please install Phantom.');
      return;
    }
    try {
      const response = await window.solana.connect();
      const payer = response.publicKey.toString();
      const recipient = '8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj'; // From env or hardcode
      const res = await axios.post('/api/tx/usdc', { payer, recipient, amount: 1, reference: solanaReference });
      const { transaction } = res.data;
      const txBuffer = Buffer.from(transaction, 'base64');
      const tx = Transaction.from(txBuffer);
      const { signature } = await window.solana.signAndSendTransaction(tx);
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
      await connection.confirmTransaction(signature, 'confirmed');
      alert('Payment successful! Now submit the listing.');
    } catch (error) {
      console.error(error);
      alert('Payment failed: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto">
      <div className="mb-4">
        <label>Building Name</label>
        <input type="text" name="building_name" value={formData.building_name} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>Coordinates (lat,lng)</label>
        <input type="text" name="coordinates" value={formData.coordinates} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>Floor</label>
        <input type="text" name="floor" value={formData.floor} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>Size (sqm)</label>
        <input type="number" name="sqm" value={formData.sqm} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>Cost (THB)</label>
        <input type="number" name="cost" value={formData.cost} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>YouTube Link</label>
        <input type="url" name="youtube_link" value={formData.youtube_link} onChange={handleChange} required className="border p-2 w-full" />
      </div>
      <div className="mb-4">
        <label>Reference</label>
        <input type="text" name="reference" value={formData.reference} readOnly className="border p-2 w-full" />
      </div>
      <div className="flex justify-between mb-4">
        <canvas id="solana-qr" className={formData.payment_network === 'solana' ? '' : 'hidden'}></canvas>
      </div>
      <button type="button" onClick={handlePayWithPhantom} className="bg-purple-500 text-white p-2 mt-4">Pay with Phantom</button>
      <button type="submit" className="bg-green-500 text-white p-2 w-full">Submit Listing</button>
    </form>
  );
}

export default CreatePage;
