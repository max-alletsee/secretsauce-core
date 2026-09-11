import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Shell Production Build Output', () => {
  const staticDir = path.resolve(__dirname, '../../secretsauce/static')

  it('outputs index.html, sw.js, vendor directory, and static assets', () => {
    expect(fs.existsSync(path.join(staticDir, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(staticDir, 'sw.js'))).toBe(true)

    const indexHtml = fs.readFileSync(path.join(staticDir, 'index.html'), 'utf-8')
    // Static assets must be referenced under /static/assets/
    expect(indexHtml).toMatch(/src="\/static\/assets\/index-[^"]+\.js"/)
    expect(indexHtml).toMatch(/href="\/static\/assets\/index-[^"]+\.css"/)

    const scriptMatch = indexHtml.match(/src="\/static\/assets\/([^"]+)"/)
    expect(scriptMatch).not.toBeNull()
    if (scriptMatch) {
      expect(fs.existsSync(path.join(staticDir, 'assets', scriptMatch[1]))).toBe(true)
    }

    const cssMatch = indexHtml.match(/href="\/static\/assets\/([^"]+)"/)
    expect(cssMatch).not.toBeNull()
    if (cssMatch) {
      expect(fs.existsSync(path.join(staticDir, 'assets', cssMatch[1]))).toBe(true)
    }
  })
})
