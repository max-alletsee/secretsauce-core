import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

// Create secretsauce-ui.js in vendor directory
const uiIndexPath = path.resolve(__dirname, '../packages/ui/src/index.ts')
const vendorUIPath = path.join(vendorDir, 'secretsauce-ui.js')
if (!fs.existsSync(vendorUIPath)) {
  fs.writeFileSync(
    vendorUIPath,
    '// SecretSauce UI runtime vendor bundle\nexport * from "./secretsauce-ui.js";\n',
    'utf-8'
  )
}

console.log('Vendoring completed successfully.')
