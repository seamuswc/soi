import React, { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { parseUnits } from 'viem';
import { mainnet, base, arbitrum } from 'wagmi/chains';

// USDC contract addresses
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

function PaymentQRModal({ network, amount, reference, merchantAddress, onClose, onSuccess }) {
  const [status, setStatus] = useState('connect'); // connect, pending, sending, checking, confirmed, failed
  const [txHash, setTxHash] = useState(null);
  
  // Wagmi hooks for Ethereum/Base
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, data: txData, error: txError } = useSendTransaction();
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConnected && status === 'connect') {
      setStatus('pending');
    }
  }, [isConnected, status]);

  useEffect(() => {
    if (txData) {
      setTxHash(txData);
      setStatus('checking');
    }
  }, [txData]);

  useEffect(() => {
    if (isTxConfirmed && txHash) {
      setStatus('confirmed');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  }, [isTxConfirmed, txHash, onSuccess]);

  useEffect(() => {
    if (txError) {
      console.error('Transaction error:', txError);
      setStatus('failed');
    }
  }, [txError]);

  const getChainId = () => {
    const chainIds = {
      ethereum: mainnet.id,
      arbitrum: arbitrum.id,
      base: base.id
    };
    return chainIds[network];
  };

  const getUSDCAddress = () => {
    const usdcAddresses = {
      ethereum: USDC_MAINNET,
      arbitrum: USDC_ARBITRUM,
      base: USDC_BASE
    };
    return usdcAddresses[network];
  };

  const handleConnectWallet = () => {
    const walletConnectConnector = connectors.find(c => c.id === 'walletConnect');
    if (walletConnectConnector) {
      connect({ connector: walletConnectConnector });
    }
  };

  const handleSendPayment = async () => {
    if (!merchantAddress) return;
    
    const targetChainId = getChainId();
    
    // Switch chain if needed
    if (chain?.id !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (error) {
        console.error('Chain switch error:', error);
        setStatus('failed');
        return;
      }
    }
    
    setStatus('sending');
    
    try {
      // Send USDC (ERC-20 transfer)
      const amountInSmallestUnit = parseUnits(amount.toString(), 6);
      const transferFunctionData = `0xa9059cbb${merchantAddress.slice(2).padStart(64, '0')}${amountInSmallestUnit.toString(16).padStart(64, '0')}`;
      
      await sendTransaction({
        to: getUSDCAddress(),
        data: transferFunctionData,
        chainId: targetChainId
      });
    } catch (error) {
      console.error('Send payment error:', error);
      setStatus('failed');
    }
  };

  const getNetworkName = () => {
    const names = {
      ethereum: 'Ethereum',
      arbitrum: 'Arbitrum',
      base: 'Base',
      thb: 'Thai Baht'
    };
    return names[network] || network;
  };

  const getNetworkColor = () => {
    const colors = {
      ethereum: 'from-purple-600 to-blue-600',
      arbitrum: 'from-cyan-600 to-blue-700',
      base: 'from-blue-600 to-blue-700',
      thb: 'from-green-600 to-green-700'
    };
    return colors[network] || 'from-gray-600 to-gray-700';
  };

  const getConnectedAddress = () => {
    if (address) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return '';
  };

  // All supported networks are EVM-based and use WalletConnect
  const isWalletConnected = isConnected;

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
            if (isWalletConnected) disconnect();
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
              Scan QR code or click to connect your wallet
            </p>
            <button
              onClick={handleConnectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
            <p className="text-xs text-gray-500 mt-3">
              MetaMask, WalletConnect, Coinbase Wallet & more
            </p>
          </div>
        )}

        {status === 'pending' && isWalletConnected && (
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
