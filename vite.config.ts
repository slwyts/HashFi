import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/',
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  }
})
