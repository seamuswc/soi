import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import postcss from './postcss.config.js';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from root directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  
  return {
    plugins: [react()],
  css: {
    postcss,
  },
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: env.API_URL || 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  };
});
