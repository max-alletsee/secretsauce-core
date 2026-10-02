import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test.setTimeout(60000)

test('imports_draft_through_the_registered_recipe_provider', async ({ page }) => {
  await login(page)
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
  const before = (await (await page.request.get('/api/recipes')).json()).total
  await page.getByRole('link', { name: 'Recipes', exact: true }).first().click()
  await page.getByRole('button', { name: 'New recipe', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Import with AI…' }).click()
  await page.getByRole('tab', { name: 'Paste text', exact: true }).click()
  await page.getByLabel('Recipe text').fill('Chickpea lemon soup: 400g chickpeas, simmer ten minutes.')
  await page.getByRole('button', { name: 'Extract recipe', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Chickpeas')
  await expect(page.getByRole('dialog')).toContainText('Simmer for ten minutes.')
  expect((await (await page.request.get('/api/recipes')).json()).total).toBe(before)
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Chickpea lemon soup', exact: true })).toBeVisible()
  await expect(page.locator('.recipe-detail-page')).toContainText('Chickpeas')
  await expect(page.locator('.recipe-detail-page')).toContainText('Simmer for ten minutes.')
})

test('Photo reads real file bytes and sends base64 and MIME without saving the draft', async ({ page }) => {
  await login(page)
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
  const before = (await (await page.request.get('/api/recipes')).json()).total
  await page.getByRole('link', { name: 'Recipes', exact: true }).first().click()
  await page.getByRole('button', { name: 'New recipe', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Import with AI…' }).click()
  await page.getByRole('tab', { name: 'Photo', exact: true }).click()
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS0AAAAASUVORK5CYII=', 'base64')
  await page.getByLabel('Recipe photo').setInputFiles({ name: 'recipe.png', mimeType: 'image/png', buffer: bytes })
  await expect(page.getByAltText('Selected recipe photo')).toBeVisible()
  const requested = page.waitForRequest(request => request.url().endsWith('/core-recipe-importer/parse-image') && request.method() === 'POST')
  await page.getByRole('button', { name: 'Extract recipe', exact: true }).click()
  expect((await requested).postDataJSON()).toEqual({ image_base64: bytes.toString('base64'), mime_type: 'image/png', auto_save: false })
  await expect(page.getByRole('dialog')).toContainText('Chickpeas')
  expect((await (await page.request.get('/api/recipes')).json()).total).toBe(before)
  await page.getByLabel('Recipe photo').setInputFiles({ name: 'not-a-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('dialog')).toContainText('Choose an image file')
  await expect(page.getByAltText('Selected recipe photo')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Extract recipe', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save recipe', exact: true })).toHaveCount(0)
})

test('unconfigured AI explains how to configure it', async ({ page }) => {
  await login(page)
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: '' } })
  try {
    await page.getByRole('link', { name: 'Recipes', exact: true }).first().click()
    await page.getByRole('button', { name: 'New recipe', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Import with AI…' }).click()
    await page.getByRole('tab', { name: 'Paste text', exact: true }).click()
    await page.getByLabel('Recipe text').fill('Soup')
    await page.getByRole('button', { name: 'Extract recipe', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText("AI isn’t set up yet")
    await page.getByRole('button', { name: 'Open AI settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\?section=core-ai-provider$/)
    await expect(page.locator('#settings-core-ai-provider').getByLabel('Model name', { exact: true })).toBeVisible()
  } finally {
    await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
  }
})
