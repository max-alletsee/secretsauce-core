import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test.setTimeout(60000)

test('save, filter multi-select, search by author, navigate from detail, and edit recipe sources', async ({ page, request }) => {
  await login(page)

  // Seed recipes via real API: cookbook, website, and no source
  const rBook = await request.post('/api/recipes', {
    data: {
      title: 'Herb Baked Feta',
      language: 'en',
      servings: 4,
      source: {
        type: 'cookbook',
        name: 'Simple',
        author: 'Yotam Ottolenghi',
        page: '112',
      },
    },
  })
  expect(rBook.status()).toBe(201)
  const bookRecipe = await rBook.json()

  const rWeb = await request.post('/api/recipes', {
    data: {
      title: 'Crispy Smitten Galette',
      language: 'en',
      servings: 4,
      source: {
        type: 'website',
        name: 'Smitten Kitchen',
        url: 'https://smittenkitchen.com/galette',
      },
    },
  })
  expect(rWeb.status()).toBe(201)
  const webRecipe = await rWeb.json()

  // Navigate to recipe list and check MultiSelect source filter
  await page.goto('/recipes')
  await expect(page.locator('.recipe-card').filter({ hasText: 'Herb Baked Feta' })).toBeVisible()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Crispy Smitten Galette' })).toBeVisible()

  // Open MultiSelect source filter and select both "Simple" and "Smitten Kitchen"
  await page.locator('.source-filter-select').click()
  const overlay = page.locator('.p-multiselect-overlay')
  await expect(overlay).toBeVisible()
  await overlay.getByText('Simple (Yotam Ottolenghi)').click()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Herb Baked Feta' })).toBeVisible()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Crispy Smitten Galette' })).toHaveCount(0)

  await overlay.getByText('Smitten Kitchen').click()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Herb Baked Feta' })).toBeVisible()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Crispy Smitten Galette' })).toBeVisible()

  // Deselect both and filter by "No source"
  await overlay.getByText('Simple (Yotam Ottolenghi)').click()
  await overlay.getByText('Smitten Kitchen').click()
  await overlay.getByText('No source').click()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Herb Baked Feta' })).toHaveCount(0)
  await expect(page.locator('.recipe-card').filter({ hasText: 'Crispy Smitten Galette' })).toHaveCount(0)
  await expect(page.locator('.recipe-card').filter({ hasText: "Grandma's Tomato Pasta" })).toBeVisible()

  // Clear "No source" filter
  await overlay.getByText('No source').click()
  await page.keyboard.press('Escape')

  // Search by source author in main search box (FTS trigram)
  await page.getByLabel('Search recipes').fill('Ottolenghi')
  await expect(page.locator('.recipe-card').filter({ hasText: 'Herb Baked Feta' })).toBeVisible()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Crispy Smitten Galette' })).toHaveCount(0)

  // Visit website recipe detail: verify external link + source click navigates to filtered list
  await page.goto(`/recipes/${webRecipe.id}`)
  const extLink = page.getByRole('link', { name: 'Open source URL' })
  await expect(extLink).toHaveAttribute('href', 'https://smittenkitchen.com/galette')
  await expect(extLink).toHaveAttribute('target', '_blank')

  await page.locator('.source-filter-link', { hasText: 'Smitten Kitchen' }).click()
  await expect(page).toHaveURL(/\/recipes$/)
  await expect(page.locator('.recipe-card').filter({ hasText: 'Crispy Smitten Galette' })).toBeVisible()
  await expect(page.locator('.recipe-card').filter({ hasText: 'Herb Baked Feta' })).toHaveCount(0)

  // Edit cookbook recipe page number and verify persisted on detail
  await page.goto(`/recipes/${bookRecipe.id}/edit`)
  await expect(page.locator('#recipe-source-name')).toHaveValue('Simple')
  await expect(page.locator('#recipe-source-page')).toHaveValue('112')
  await page.locator('#recipe-source-page').fill('118')
  await page.getByRole('button', { name: 'Save Recipe', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/recipes/${bookRecipe.id}$`))
  await expect(page.locator('.recipe-source-attribution')).toContainText('p. 118')
})

test('import dialog lets user specify a cookbook source before saving', async ({ page }) => {
  await login(page)
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
  await page.goto('/recipes')
  await page.getByRole('button', { name: 'New recipe', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Import with AI…' }).click()
  await page.getByRole('tab', { name: 'Paste text', exact: true }).click()
  await page.getByLabel('Recipe text').fill('Chickpea lemon soup from Jerusalem p. 42')
  await page.getByRole('button', { name: 'Extract recipe', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Chickpeas')

  await page.locator('#import-source-name').fill('Jerusalem')
  await page.locator('#import-source-author').fill('Yotam Ottolenghi')
  await page.locator('#import-source-page').fill('42')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()

  await expect(page).toHaveURL(/\/recipes\/[^/]+$/)
  await expect(page.locator('.recipe-source-attribution')).toContainText('Jerusalem')
  await expect(page.locator('.recipe-source-attribution')).toContainText('p. 42')
  await expect(page.locator('.recipe-source-attribution')).toContainText('Yotam Ottolenghi')
})
