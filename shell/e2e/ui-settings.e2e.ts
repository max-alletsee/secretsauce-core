import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test('plugins_redirect_and_toggle_update_navigation', async ({ page }) => {
  await login(page)
  await page.goto('/plugins')
  await expect(page).toHaveURL(/\/settings\?section=plugins$/)
  const panel = page.locator('#settings-plugins')
  await expect(panel.getByRole('button', { name: 'Plugins', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await page.evaluate(() => { (window as any).__settingsSentinel = 'alive' })
  const row = panel.locator('[data-plugin-id=core-shopping-list]')
  try {
    await row.getByRole('switch').uncheck()
    await expect(page.locator('.ss-app-nav a').filter({ hasText: 'Shopping list' })).toHaveCount(0)
    await expect.poll(async () => (await (await page.request.get('/api/plugins/core-shopping-list')).json()).state).toBe('disabled')
    await row.getByRole('switch').check()
    await expect(page.getByRole('link', { name: 'Shopping list', exact: true }).first()).toBeVisible()
    expect(await page.evaluate(() => (window as any).__settingsSentinel)).toBe('alive')
    await page.getByRole('link', { name: 'Shopping list', exact: true }).first().click()
    await expect(page.locator('.shopping-list-page')).toBeVisible()
  } finally { await page.request.post('/api/plugins/core-shopping-list/enable') }
})

test('plugin settings registrations disappear and return without duplicate requests', async ({ page }) => {
  await login(page)
  await page.goto('/settings?section=plugins')
  await page.evaluate(() => { (window as any).__settingsSentinel = 'alive' })
  const row = page.locator('[data-plugin-id=core-ai-provider]')
  const calls: string[] = []
  page.on('request', request => { if (request.url().includes('/api/plugins/core-ai-provider/') && request.method() === 'POST') calls.push(request.url()) })
  try {
    await row.getByRole('switch').uncheck()
    await expect(page.locator('#settings-core-ai-provider')).toHaveCount(0)
    await row.getByRole('switch').check()
    await expect(page.locator('#settings-core-ai-provider')).toHaveCount(1)
    await page.locator('#settings-core-ai-provider').getByRole('button', { name: 'AI & Budget', exact: true }).click()
    await expect(page.getByLabel('Model name', { exact: true })).toBeVisible()
    expect(calls.filter(url => url.endsWith('/disable'))).toHaveLength(1)
    expect(calls.filter(url => url.endsWith('/enable'))).toHaveLength(1)
    expect(await page.evaluate(() => (window as any).__settingsSentinel)).toBe('alive')
  } finally { await page.request.post('/api/plugins/core-ai-provider/enable') }
})

test('household slots can be added, renamed and reordered without changing identity', async ({ page }) => {
  await login(page)
  expect((await page.request.patch('/api/household', { data: { meal_types: [{ id: 'dinner', label: 'Dinner' }] } })).ok()).toBe(true)
  await page.goto('/settings'); await page.reload()
  const panel = page.locator('#settings-household')
  await panel.getByRole('button', { name: 'Add slot', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Slot name', { exact: true }).fill('Lunch')
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click()
  await panel.getByLabel('Label for dinner', { exact: true }).fill('Evening meal')
  await panel.getByRole('button', { name: 'Move Lunch up', exact: true }).click()
  await panel.getByRole('button', { name: 'Save household', exact: true }).click()
  const expected = [{ id: 'lunch', label: 'Lunch' }, { id: 'dinner', label: 'Evening meal' }]
  await expect.poll(async () => (await (await page.request.get('/api/household')).json()).meal_types).toEqual(expected)
  await page.reload()
  await expect(panel.getByLabel('Label for dinner', { exact: true })).toHaveValue('Evening meal')
  await expect(panel.locator('[data-slot-id]').first()).toHaveAttribute('data-slot-id', 'lunch')
})

test('AI-settings link opens one panel and stale device panel ids cannot break Settings', async ({ page }) => {
  await login(page)
  await page.evaluate(() => localStorage.setItem('ss-settings-open', '["missing-panel"]'))
  await page.goto('/settings?section=core-ai-provider')
  const panel = page.locator('#settings-core-ai-provider')
  await expect(panel.getByRole('button', { name: 'AI & Budget', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByLabel('Model name', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'AI & Budget', exact: true })).toHaveCount(1)
  await page.reload()
  await expect(panel.getByLabel('Model name', { exact: true })).toBeVisible()
  await page.goto('/settings?section=missing-panel')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
})

test('denied device storage still permits household editing and saving', async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) Object.defineProperty(Storage.prototype, method, { value() { throw new DOMException('Denied', 'SecurityError') } })
  })
  await login(page)
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('SecurityError')) failures.push(message.text()) })
  await page.goto('/settings')
  const panel = page.locator('#settings-household')
  await panel.getByLabel('Household name', { exact: true }).fill('Storage-free household')
  await panel.getByRole('button', { name: 'Save household', exact: true }).click()
  await expect.poll(async () => (await (await page.request.get('/api/household')).json()).household_name).toBe('Storage-free household')
  await page.reload()
  await expect(panel.getByLabel('Household name', { exact: true })).toHaveValue('Storage-free household')
  expect(failures).toEqual([])
})
