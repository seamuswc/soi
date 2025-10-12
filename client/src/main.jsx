import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import MapPage from './components/MapPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/:name" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
