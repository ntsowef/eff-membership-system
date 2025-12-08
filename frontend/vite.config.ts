/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external access
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'chunk-MYSE25TX.js',
      'chunk-O7L3EQ5H.js',
      'chunk-XYUXPGWQ.js',
      'chunk-J6POAYNW.js',
      'chunk-JFTWKUK5.js',
      'chunk-OWRKKZ7G.js',
      'chunk-5LXP2RUJ.js',
      'chunk-VASY6R4K.js',
      'chunk-VKOGV2SF.js',
      'chunk-JXGDMFB6.js',
      'chunk-SJNWXYXV.js',
      'chunk-HE43T4XM.js',
    ],
    force: true, // Force re-optimization
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
