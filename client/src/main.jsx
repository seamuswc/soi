import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import MapPage from './components/MapPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/:name" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
