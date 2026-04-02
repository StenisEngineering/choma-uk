import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Always produce fresh builds — no stale cache
    rollupOptions: {
      output: {
        // Add timestamp to filenames so browser always loads fresh
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      }
    }
  },
  // Clear cache on every dev server start
  cacheDir: '.vite',
})
