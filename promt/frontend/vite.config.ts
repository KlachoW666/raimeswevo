import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/miniapp/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'react';
            if (id.includes('react-router')) return 'router';
            if (id.includes('zustand')) return 'zustand';
            if (id.includes('lucide-react')) return 'lucide';
            return 'vendor';
          }
          if (id.includes('pages/AdminPage')) return 'admin';
          if (id.includes('pages/WalletPage')) return 'wallet';
          if (id.includes('pages/ExchangePage')) return 'exchange';
          if (id.includes('pages/ReferralPage')) return 'referral';
          if (id.includes('pages/StatsPage')) return 'stats';
          if (id.includes('pages/SettingsPage')) return 'settings';
          if (id.includes('pages/AuthPage')) return 'auth';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
