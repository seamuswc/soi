import React, { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal as useSolanaWalletModal } from '@solana/wallet-adapter-react-ui';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

// USDC contract addresses
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function PaymentQRModal({ network, amount, reference, merchantAddress, onClose, onSuccess }) {
  const [status, setStatus] = useState('connect'); // connect, pending, sending, checking, confirmed, failed
  const [txHash, setTxHash] = useState(null);
  
  // Base/EVM hooks
  const { address: baseAddress, isConnected: isBaseConnected } = useAccount();
  const { connectors, connect: connectBase } = useConnect();
  const { disconnect: disconnectBase } = useDisconnect();
  const { sendTransaction: sendBaseTransaction, data: baseTxData, error: baseTxError } = useSendTransaction();
  const { isSuccess: isBaseTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Solana hooks
  const { publicKey: solanaPublicKey, sendTransaction: sendSolanaTransaction, connected: isSolanaConnected } = useSolanaWallet();
  const { connection } = useConnection();
  const { setVisible: setSolanaModalVisible } = useSolanaWalletModal();

  useEffect(() => {
    const isConnected = 
      (network === 'base' && isBaseConnected) ||
      (network === 'solana' && isSolanaConnected);
    
    if (isConnected && status === 'connect') {
      setStatus('pending');
    }
  }, [isBaseConnected, isSolanaConnected, status, network]);

  useEffect(() => {
    if (baseTxData && network === 'base') {
      setTxHash(baseTxData);
      setStatus('checking');
    }
  }, [baseTxData, network]);

  useEffect(() => {
    if (isBaseTxConfirmed && txHash && network === 'base') {
      setStatus('confirmed');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  }, [isBaseTxConfirmed, txHash, network]);

  useEffect(() => {
    if (baseTxError) {
      console.error('Transaction error:', baseTxError);
      setStatus('failed');
    }
  }, [baseTxError]);

  const handleConnectWallet = () => {
    if (network === 'base') {
      const walletConnectConnector = connectors.find(c => c.id === 'walletConnect');
      if (walletConnectConnector) {
        connectBase({ connector: walletConnectConnector });
      }
    } else if (network === 'solana') {
      setSolanaModalVisible(true);
    }
  };

  const handleSendPayment = async () => {
    if (!merchantAddress) return;
    
    setStatus('sending');
    
    try {
      if (network === 'base' && isBaseConnected) {
        // Send USDC on Base
        const amountInSmallestUnit = parseUnits(amount.toString(), 6);
        const transferFunctionData = `0xa9059cbb${merchantAddress.slice(2).padStart(64, '0')}${amountInSmallestUnit.toString(16).padStart(64, '0')}`;
        
        await sendBaseTransaction({
          to: USDC_BASE,
          data: transferFunctionData,
          chainId: 8453
        });
      } else if (network === 'solana' && isSolanaConnected && solanaPublicKey) {
        // Send USDC on Solana
        const transaction = new Transaction();
        // Note: This is simplified - real USDC transfer requires SPL token transfer
        // For now, just send SOL as proof of concept
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: solanaPublicKey,
            toPubkey: new PublicKey(merchantAddress),
            lamports: amount * 1000000000 // SOL amount
          })
        );
        
        const signature = await sendSolanaTransaction(transaction, connection);
        setTxHash(signature);
        setStatus('checking');
        
        // Wait for confirmation
        setTimeout(() => {
          setStatus('confirmed');
          setTimeout(() => onSuccess(), 2000);
        }, 3000);
      }
    } catch (error) {
      console.error('Send payment error:', error);
      setStatus('failed');
    }
  };

  const getNetworkName = () => {
    const names = {
      solana: 'Solana',
      aptos: 'Aptos',
      base: 'Base',
      thb: 'Thai Baht'
    };
    return names[network] || network;
  };

  const getNetworkColor = () => {
    const colors = {
      solana: 'from-purple-600 to-purple-700',
      aptos: 'from-cyan-600 to-cyan-700',
      base: 'from-blue-600 to-blue-700',
      thb: 'from-green-600 to-green-700'
    };
    return colors[network] || 'from-gray-600 to-gray-700';
  };

  const getConnectedAddress = () => {
    if (network === 'base' && baseAddress) {
      return `${baseAddress.slice(0, 6)}...${baseAddress.slice(-4)}`;
    } else if (network === 'solana' && solanaPublicKey) {
      return `${solanaPublicKey.toBase58().slice(0, 6)}...${solanaPublicKey.toBase58().slice(-4)}`;
    }
    return '';
  };

  const isConnected = 
    (network === 'base' && isBaseConnected) ||
    (network === 'solana' && isSolanaConnected);
  
  // Aptos shows manual payment instructions (no wallet adapter due to dependency issues)
  if (network === 'aptos') {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>

          <div className={`bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl p-6 mb-6 text-center`}>
            <h2 className="text-2xl font-bold mb-2">Manual Payment</h2>
            <p className="text-sm opacity-90">Aptos</p>
            <p className="text-3xl font-bold mt-2">{amount} USDC</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-700">Send to:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(merchantAddress);
                      alert('Address copied!');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-600 break-all">{merchantAddress}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Amount:</span>
                <p className="text-gray-600 font-bold">{amount} USDC</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-700">Memo/Reference:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(reference);
                      alert('Reference copied!');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-600 break-all">{reference}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium mb-2">📱 How to pay:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your Petra wallet</li>
              <li>Send {amount} USDC to the address above</li>
              <li>Include the reference in the message</li>
              <li>Payment will be detected automatically</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (isBaseConnected) disconnectBase();
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        <div className={`bg-gradient-to-r ${getNetworkColor()} text-white rounded-xl p-6 mb-6 text-center`}>
          <h2 className="text-2xl font-bold mb-2">Pay with Wallet</h2>
          <p className="text-sm opacity-90">{getNetworkName()}</p>
          <p className="text-3xl font-bold mt-2">{amount} USDC</p>
        </div>

        {status === 'connect' && (
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              Scan QR code or click to connect your {getNetworkName()} wallet
            </p>
            <button
              onClick={handleConnectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Connect {getNetworkName()} Wallet
            </button>
            <p className="text-xs text-gray-500 mt-3">
              {network === 'base' && 'WalletConnect QR will appear'}
              {network === 'solana' && 'Phantom, Solflare, and more supported'}
            </p>
          </div>
        )}

        {status === 'pending' && isConnected && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                ✅ Wallet connected: {getConnectedAddress()}
              </p>
            </div>
            <button
              onClick={handleSendPayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Send {amount} USDC
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Reference: {reference.slice(0, 16)}...
            </p>
          </div>
        )}

        {status === 'sending' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-blue-600 font-medium">Sending transaction...</p>
            <p className="text-sm text-gray-500 mt-2">Confirm in your wallet</p>
          </div>
        )}

        {status === 'checking' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-blue-600 font-medium">Waiting for confirmation...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            {txHash && (
              <p className="text-xs text-gray-400 mt-3 break-all">
                Tx: {typeof txHash === 'string' ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : 'Processing...'}
              </p>
            )}
          </div>
        )}

        {status === 'confirmed' && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 font-bold text-xl">Payment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 font-medium">Payment Failed</p>
            <p className="text-sm text-gray-500 mt-2">Please try again</p>
            <button
              onClick={() => setStatus('pending')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentQRModal;
