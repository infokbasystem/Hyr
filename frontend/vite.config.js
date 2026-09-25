import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Set VITE_HTTPS=false to serve over plain http instead of https
const useHttps = process.env.VITE_HTTPS !== 'false'

export default defineConfig({
  plugins: [react(), mkcert(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: true,
    https: useHttps,
  },
})
