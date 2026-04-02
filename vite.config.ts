import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/sistema/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './client/src') } },
  server: { proxy: { '/trpc': 'http://localhost:3050', '/uploads': 'http://localhost:3050', '/api': 'http://localhost:3050' } },
})
