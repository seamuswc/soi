import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import postcss from './postcss.config.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss,
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
