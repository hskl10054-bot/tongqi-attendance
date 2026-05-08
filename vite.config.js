import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tongqi-attendance/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
