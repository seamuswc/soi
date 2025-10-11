import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config } from './wagmiConfig'
import './index.css'
import MapPage from './components/MapPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'
import DashboardPage from './components/DashboardPage'

const queryClient = new QueryClient()

// Create Web3Modal for Ethereum/Base
createWeb3Modal({
  wagmiConfig: config,
  projectId: '06866621556efc2fe61f94f0034eec42',
  enableAnalytics: false
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/:name" element={<DetailPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
