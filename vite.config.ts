import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks so the new framer-motion
        // dependency doesn't inflate the main bundle (was ~785 kB).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase'
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils'))
              return 'framer-motion'
            // Keep three.js + R3F in one shared vendor chunk so the six 3D
            // mini-games load it once instead of duplicating it per component.
            if (
              id.includes('/three/') ||
              id.includes('three-stdlib') ||
              id.includes('@react-three')
            )
              return 'three'
          }
        },
      },
    },
  },
})
