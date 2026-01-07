import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    // Use /nemx/ as base path in production, / in development
    base: mode === 'production' ? '/nemx/' : '/',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
    },
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL || ''),
    },
  }
})
