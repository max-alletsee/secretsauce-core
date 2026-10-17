import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test('recipe magic adapts recipe and applies to editor', async ({ page, request }) => {
  await login(page)
  const response = await request.post('/api/recipes', {
    data: {
      title: 'Bolognese Pasta',
      language: 'en',
      servings: 4,
      prep_time_minutes: 20,
      cook_time_minutes: 60,
      ingredients: [
        { name: 'Ground beef', quantity: 500, unit: 'g' },
        { name: 'Pasta', quantity: 400, unit: 'g' },
      ],
      steps: [
        { instruction: 'Brown ground beef in olive oil.' },
        { instruction: 'Simmer with tomatoes and pasta.' },
      ],
    },
  })
  expect(response.status()).toBe(201)
  const recipe = await response.json()

  // 1. Go to edit page
  await page.goto(`/recipes/${recipe.id}/edit`)
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Bolognese Pasta')

  // 2. Click Make it Magic
  const magicBtn = page.getByRole('button', { name: 'Make it Magic' })
  await expect(magicBtn).toBeVisible()
  await magicBtn.click()

  // 3. Dialog opens and actions are visible
  await expect(page.getByText('Make it Magic: Adapt Recipe')).toBeVisible()
  const vegAction = page.getByRole('button', { name: /Make it vegetarian/i })
  await expect(vegAction).toBeVisible()

  // 4. Trigger adaptation
  await vegAction.click()

  // 5. Preview appears with AI adaptation summary
  await expect(page.getByText(/AI Adaptation Summary:/i)).toBeVisible()
  await expect(page.getByText(/Replaced ground meat with sautéed mushrooms/i)).toBeVisible()

  // 6. Apply to editor
  const applyBtn = page.getByRole('button', { name: 'Apply to Editor' })
  await expect(applyBtn).toBeVisible()
  await applyBtn.click()

  // 7. Verify editor form fields updated
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Vegetarian Pasta')
  await page.getByRole('button', { name: 'Save Recipe' }).click()

  // 8. Saved and navigated to detail page
  await expect(page).toHaveURL(`/recipes/${recipe.id}`)
  await expect(page.locator('.detail-header h1')).toHaveText('Vegetarian Pasta')
})

test('recipe magic saves directly as a new recipe variation', async ({ page, request }) => {
  await login(page)
  const response = await request.post('/api/recipes', {
    data: {
      title: 'Classic Meatloaf',
      language: 'en',
      servings: 4,
      ingredients: [{ name: 'Ground beef', quantity: 600, unit: 'g' }],
      steps: [{ instruction: 'Bake loaf.' }],
    },
  })
  expect(response.status()).toBe(201)
  const recipe = await response.json()

  await page.goto(`/recipes/${recipe.id}/edit`)
  await page.getByRole('button', { name: 'Make it Magic' }).click()
  await page.getByRole('button', { name: /Make it vegetarian/i }).click()

  await expect(page.getByText(/AI Adaptation Summary:/i)).toBeVisible()
  const forkBtn = page.getByRole('button', { name: 'Save as New Recipe' })
  await expect(forkBtn).toBeVisible()
  await forkBtn.click()

  // Should navigate to new recipe detail view
  await expect(page).toHaveURL(/\/recipes\/(?!.*edit).+/)
  await expect(page.locator('.detail-header h1')).toHaveText('Vegetarian Pasta')

  // Original recipe remains intact
  const origResp = await request.get(`/api/recipes/${recipe.id}`)
  expect(origResp.status()).toBe(200)
  const origData = await origResp.json()
  expect(origData.title).toBe('Classic Meatloaf')
})
