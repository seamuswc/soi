import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, base, arbitrum } from '@reown/appkit/networks'
import { config } from './wagmiConfig'
import './index.css'
import MapPage from './components/MapPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'
import DashboardPage from './components/DashboardPage'

const queryClient = new QueryClient()

const projectId = '06866621556efc2fe61f94f0034eec42'

// Create Reown AppKit
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, base, arbitrum],
  projectId
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, base, arbitrum],
  projectId,
  features: {
    analytics: false
  }
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
