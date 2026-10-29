const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const path = require('path')

module.exports = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cryptoshield/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
      },
      '/ml': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
  },
  // Disable esbuild service worker entirely on Windows for all Vite operations
  // (dev, preview, config bundling, build, optimizeDeps) to avoid EPERM spawn errors
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    service: false,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
    disabled: true,
  },
})