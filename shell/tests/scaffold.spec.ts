import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Shell Workspace Scaffolding', () => {
  it('has pnpm workspace defining shell and packages/ui', () => {
    const workspacePath = path.resolve(__dirname, '../pnpm-workspace.yaml')
    expect(fs.existsSync(workspacePath)).toBe(true)
    const content = fs.readFileSync(workspacePath, 'utf-8')
    expect(content).toContain("packages:")
    expect(content).toContain("packages/*")
  })

  it('has @secretsauce/ui package.json with name and exports', () => {
    const pkgPath = path.resolve(__dirname, '../packages/ui/package.json')
    expect(fs.existsSync(pkgPath)).toBe(true)
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    expect(pkg.name).toBe('@secretsauce/ui')
    expect(pkg.version).toBe('1.0.0')
  })
})
