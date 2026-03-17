// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'  // ← Comment out or configure properly

export default defineConfig({
  plugins: [
    react(),
    // ✅ EITHER: Disable PWA for development
    // OR configure it properly:
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   devOptions: { enabled: false },  // ← Disable in dev
    //   workbox: {
    //     navigateFallback: '/index.html',
    //     navigateFallbackDenylist: [/^\/api/],
    //   },
    //   manifest: {
    //     name: 'Arctic Coolers Ledger',
    //     short_name: 'ArcticLedger',
    //     start_url: '/',
    //     display: 'standalone',
    //     background_color: '#ffffff',
    //     theme_color: '#0ea5e9',
    //   },
    // }),
  ],
  server: {
    port: 5173,
    open: true,
  },
})