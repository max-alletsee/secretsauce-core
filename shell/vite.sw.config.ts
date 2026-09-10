import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: '../secretsauce/static',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/sw/sw.ts'),
      name: 'SecretSauceSW',
      formats: ['iife'],
      fileName: () => 'sw.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
})
