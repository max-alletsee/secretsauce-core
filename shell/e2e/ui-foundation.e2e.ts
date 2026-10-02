import { test, expect } from './helpers/state'
import { login, chooseMember } from './helpers/ui'

test('Settings is pinned last and Plugins is not a separate navigation item', async ({ page }) => {
  await login(page)
  const nav = page.locator('nav:visible')
  await expect(nav.locator('a').last()).toHaveText('Settings')
  await expect(nav.getByRole('link', { name: 'Plugins', exact: true })).toHaveCount(0)
})

test('phone navigation opens and closes on navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = page.getByRole('dialog')
  await expect(drawer.locator('nav a').last()).toHaveText('Settings')
  await drawer.getByRole('link', { name: 'Recipes', exact: true }).click()
  await expect(page).toHaveURL(/\/recipes$/)
  await expect(drawer).not.toBeVisible()
})

test('themes apply live and survive reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await login(page)
  const colours: string[] = []
  for (const [id, label] of [['aura-tomato', 'Aura · Tomato'], ['nora-tomato', 'Nora · Tomato'], ['material-indigo', 'Material · Indigo'], ['lara-amber', 'Lara · Amber']]) {
    await page.goto('/settings?section=device')
    await page.getByLabel('Theme', { exact: true }).click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ss-theme'))).toBe(id)
    const colour = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim())
    expect(colour).toBeTruthy()
    colours.push(colour)
    await page.reload()
    await expect(page.getByLabel('Theme', { exact: true })).toContainText(label)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim())).toBe(colour)
  }
  expect(colours[0]).toBe('#f43f5e') // Aura uses rose-500.
  expect(colours[1]).toBe('#e11d48') // Nora uses rose-600.
  expect(new Set([colours[0], colours[2], colours[3]]).size).toBe(3)
})

test('unknown themes and denied device storage do not break boot', async ({ page }) => {
  const pageErrors: string[] = [], consoleErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('401 (Unauthorized)')) consoleErrors.push(message.text()) })
  await login(page)
  await page.evaluate(() => localStorage.setItem('ss-theme', 'obsolete-theme'))
  await page.goto('/settings?section=device')
  await expect(page.getByLabel('Theme', { exact: true })).toContainText('Aura · Tomato')
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError') }
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError') }
  })
  await page.reload()
  await expect(page.locator('nav:visible').getByRole('link', { name: 'Settings' })).toBeVisible()
  await expect(page.getByLabel('Theme', { exact: true })).toBeVisible()
  await chooseMember(page, 'Charlie')
  await page.getByRole('link', { name: 'Recipes', exact: true }).first().click()
  await expect(page.locator('.recipe-list-page')).toBeVisible()
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
