import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Update base if you rename the repo
export default defineConfig({
  plugins: [react()],
  base: '/rapid-geotech-seismic-analyzer/',
})
