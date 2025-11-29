import { defineConfig } from 'vite'

// Vite config with dev proxy to backend API
export default defineConfig(({ command, mode }) => ({
  server: {
    proxy: {
      // Proxy /api to the backend running on port 3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))
