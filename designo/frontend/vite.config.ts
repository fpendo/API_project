import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/designo/',
  server: {
    port: 3020,
    proxy: {
      '/designo/api': {
        target: 'http://localhost:8620',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/designo\/api/, '/api'),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
