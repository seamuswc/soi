import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import MapPage from './components/MapPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'
import SingleListingPage from './components/SingleListingPage'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import DataPage from './components/AdvancedDataPage'
import AuthPage from './components/AuthPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/listing/:id" element={<SingleListingPage />} />
          <Route path="/:name" element={<DetailPage />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
