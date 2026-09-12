import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  base: '/static/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@secretsauce/ui': path.resolve(__dirname, './packages/ui/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../secretsauce/static',
    emptyOutDir: false,
    rollupOptions: {
      external: ['vue', 'pinia', 'vue-router'],
    },
  },
})
