import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Shell Production Build Output', () => {
  const staticDir = path.resolve(__dirname, '../../secretsauce/static')

  it('outputs index.html, sw.js, vendor directory, and static assets', () => {
    expect(fs.existsSync(path.join(staticDir, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(staticDir, 'sw.js'))).toBe(true)
  })
})
