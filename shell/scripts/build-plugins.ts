import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const searchRoots = [
  path.resolve(__dirname, '../../secretsauce/plugins/core'),
  path.resolve(__dirname, '../../plugins'),
]

async function buildPlugins() {
  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue

    const entries = fs.readdirSync(root, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pluginId = entry.name
      const pluginDir = path.join(root, pluginId)
      const uiSrc = path.join(pluginDir, 'ui', 'src', 'index.ts')
      if (!fs.existsSync(uiSrc)) continue

      const outDir = path.join(pluginDir, 'ui', 'dist')
      console.log(`Building plugin UI for: ${pluginId} -> ${outDir}`)

      await build({
        root: pluginDir,
        configFile: false,
        plugins: [vue()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '../src'),
            '@secretsauce/ui': path.resolve(__dirname, '../packages/ui/src/index.ts'),
            '@secretsauce/units': path.resolve(__dirname, '../packages/units/src/index.ts'),
          },
        },
        build: {
          lib: {
            entry: uiSrc,
            formats: ['es'],
            fileName: () => 'index.js',
          },
          outDir,
          emptyOutDir: true,
          rollupOptions: {
            external: [
              'vue',
              'pinia',
              'vue-router',
              '@secretsauce/ui',
              '@secretsauce/units',
              /^primevue\//,
              /^@primevue\//,
              /^@primeuix\//,
            ],
          },
        },
      })

      // Also copy compiled bundle to <plugin_dir>/ui.js for serving
      const distBundle = path.join(outDir, 'index.js')
      const targetUiJs = path.join(pluginDir, 'ui.js')
      if (fs.existsSync(distBundle)) {
        fs.copyFileSync(distBundle, targetUiJs)
        console.log(`Copied ${distBundle} -> ${targetUiJs}`)
      }
    }
  }
}

buildPlugins().catch((err) => {
  console.error(err)
  process.exit(1)
})
