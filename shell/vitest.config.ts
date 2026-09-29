import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setupUi.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.e2e.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@secretsauce/ui': path.resolve(__dirname, './packages/ui/src/index.ts'),
    },
  },
})
