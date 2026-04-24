import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/sistema/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './client/src') } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'

          const pagesMarker = '/client/src/pages/'
          if (id.includes(pagesMarker)) {
            const pageGroup = id.split(pagesMarker)[1]?.split('/')[0]
            if (pageGroup) return 'page-' + pageGroup.toLowerCase()
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/trpc': 'http://localhost:3050',
      '/uploads': 'http://localhost:3050',
      '/api': 'http://localhost:3050',
      '/sistema/trpc': { target: 'http://localhost:3050', rewrite: p => p.replace(/^\/sistema/, '') },
      '/sistema/uploads': { target: 'http://localhost:3050', rewrite: p => p.replace(/^\/sistema/, '') },
      '/sistema/api': { target: 'http://localhost:3050', rewrite: p => p.replace(/^\/sistema/, '') },
    },
  },
})
