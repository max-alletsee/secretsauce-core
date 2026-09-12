import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const staticDir = path.resolve(__dirname, '../../secretsauce/static')
const vendorDir = path.join(staticDir, 'vendor')
const iconsDir = path.join(staticDir, 'icons')
const publicIconsDir = path.resolve(__dirname, '../public/icons')

fs.mkdirSync(vendorDir, { recursive: true })
fs.mkdirSync(iconsDir, { recursive: true })

// Copy icons
if (fs.existsSync(publicIconsDir)) {
  for (const file of fs.readdirSync(publicIconsDir)) {
    fs.copyFileSync(path.join(publicIconsDir, file), path.join(iconsDir, file))
  }
}

async function buildVendors() {
  console.log('Building vendor bundle: vue.js')
  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve(__dirname, 'vendor-entries/vue.ts'),
        formats: ['es'],
        fileName: () => 'vue.js',
      },
      outDir: vendorDir,
      emptyOutDir: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  })

  console.log('Building vendor bundle: pinia.js')
  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve(__dirname, 'vendor-entries/pinia.ts'),
        formats: ['es'],
        fileName: () => 'pinia.js',
      },
      outDir: vendorDir,
      emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  })

  console.log('Building vendor bundle: vue-router.js')
  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve(__dirname, 'vendor-entries/vue-router.ts'),
        formats: ['es'],
        fileName: () => 'vue-router.js',
      },
      outDir: vendorDir,
      emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  })

  console.log('Building vendor bundle: secretsauce-ui.js')
  await build({
    configFile: false,
    plugins: [vue()],
    resolve: {
      alias: {
        '@secretsauce/ui': path.resolve(__dirname, '../packages/ui/src/index.ts'),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, '../packages/ui/src/index.ts'),
        formats: ['es'],
        fileName: () => 'secretsauce-ui.js',
      },
      outDir: vendorDir,
      emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  })

  console.log('Building vendor bundle: secretsauce-units.js')
  await build({
    configFile: false,
    resolve: {
      alias: {
        '@secretsauce/units': path.resolve(__dirname, '../packages/units/src/index.ts'),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, '../packages/units/src/index.ts'),
        formats: ['es'],
        fileName: () => 'secretsauce-units.js',
      },
      outDir: vendorDir,
      emptyOutDir: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  })

  console.log('Vendoring completed successfully.')
}

buildVendors().catch((err) => {
  console.error('Vendor build failed:', err)
  process.exit(1)
})
