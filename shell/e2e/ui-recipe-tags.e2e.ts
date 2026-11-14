import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test.setTimeout(60000)

test('displays household-wide tag counts and filters server-side past 50 recipes', async ({ page, request }) => {
  await login(page)

  for (let i = 0; i < 52; i++) {
    const tags = ['Weeknight']
    if (i === 51) tags.push('RareGem')
    const res = await request.post('/api/recipes', {
      data: { title: `Batch Tag Dish ${String(i).padStart(2, '0')}`, language: 'en', tags },
    })
    expect(res.status()).toBe(201)
  }

  await page.goto('/recipes')
  const weeknightBtn = page.getByRole('button', { name: 'Weeknight (52)', exact: true })
  const rareBtn = page.getByRole('button', { name: 'RareGem (1)', exact: true })
  await expect(weeknightBtn).toBeVisible()
  await expect(rareBtn).toBeVisible()

  await rareBtn.click()
  await expect(rareBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.recipe-card').filter({ hasText: 'Batch Tag Dish 51' })).toBeVisible()
  await expect(page.locator('.recipe-card')).toHaveCount(1)

  await rareBtn.click()
  await expect(rareBtn).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.recipe-card')).toHaveCount(50)
})

test('collapses tags beyond top 8 behind More/Less and preserves active hidden tag when collapsed', async ({ page, request }) => {
  await login(page)

  // Seed 10 distinct tags in addition to existing seeded tags (> 8 total)
  for (let i = 1; i <= 10; i++) {
    const tag = `TopTag${String(i).padStart(2, '0')}`
    const count = 12 - i
    for (let c = 0; c < count; c++) {
      const res = await request.post('/api/recipes', {
        data: { title: `${tag} Dish ${c}`, language: 'en', tags: [tag] },
      })
      expect(res.status()).toBe(201)
    }
  }

  await page.goto('/recipes')
  await expect(page.locator('.tag-filter-btn')).toHaveCount(8)
  const moreBtn = page.locator('.tag-more-btn')
  await expect(moreBtn).toBeVisible()
  await expect(moreBtn).toContainText('More (')

  await moreBtn.click()
  await expect(moreBtn).toHaveText('Less')
  const hiddenTagBtn = page.getByRole('button', { name: 'TopTag10 (2)', exact: true })
  await expect(hiddenTagBtn).toBeVisible()

  await hiddenTagBtn.click()
  await expect(hiddenTagBtn).toHaveAttribute('aria-pressed', 'true')
  await moreBtn.click()
  await expect(hiddenTagBtn).toBeVisible()
  await expect(page.locator('.recipe-card')).toHaveCount(2)
})

test('autocompletes existing tags sorted by usage in Recipe editor and allows new custom tags', async ({ page, request }) => {
  await login(page)

  // Seed recipes so 'Weeknight' (2) ranks above 'Quick' (1)
  await request.post('/api/recipes', { data: { title: 'Wk 1', language: 'en', tags: ['Weeknight', 'Quick'] } })
  await request.post('/api/recipes', { data: { title: 'Wk 2', language: 'en', tags: ['Weeknight'] } })

  await page.goto('/recipes/new')
  await page.getByLabel('Title', { exact: true }).fill('Tagged Toast')

  const tagInput = page.locator('#recipe-tags')
  await tagInput.fill('k')
  const options = page.locator('.p-autocomplete-option')
  await expect(options).toHaveText(['Weeknight', 'Quick'])

  // Pick existing tag from autocomplete
  await options.first().click()
  // Typing 'k' again should exclude already-selected 'Weeknight'
  await tagInput.fill('k')
  await expect(options).toHaveText(['Quick'])

  // Add brand-new custom tag via Enter
  await tagInput.fill('CozyBreakfast')
  await tagInput.press('Enter')

  await page.getByRole('button', { name: 'Save Recipe', exact: true }).click()
  await expect(page.locator('.recipe-detail-page')).toBeVisible()

  await page.goto('/recipes')
  await expect(page.getByRole('button', { name: 'Weeknight (3)', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CozyBreakfast (1)', exact: true })).toBeVisible()
})

test('configures per-device tag limit, Show all, and pinned order in Settings across reloads', async ({ page, request }) => {
  await login(page)

  // Seed tags with distinct counts
  for (let i = 0; i < 4; i++) {
    await request.post('/api/recipes', { data: { title: `Popular ${i}`, language: 'en', tags: ['Popular'] } })
  }
  await request.post('/api/recipes', { data: { title: 'Special A', language: 'en', tags: ['MidnightSnack'] } })
  await request.post('/api/recipes', { data: { title: 'Special B', language: 'en', tags: ['Brunch'] } })

  await page.goto('/settings?section=recipe-tags')
  const panel = page.locator('#settings-recipe-tags')
  await expect(panel.getByRole('button', { name: 'Recipe Tags', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByText('Popular (4)')).toBeVisible()

  await panel.getByLabel('Top tags to show', { exact: true }).fill('1')
  await panel.getByLabel('Top tags to show', { exact: true }).press('Enter')
  await panel.getByRole('button', { name: 'Pin Brunch', exact: true }).click()
  await panel.getByRole('button', { name: 'Pin MidnightSnack', exact: true }).click()
  await panel.getByRole('button', { name: 'Move MidnightSnack up', exact: true }).click()

  await page.goto('/recipes')
  await expect(page.locator('.tag-filter-btn')).toHaveText([
    'MidnightSnack (1)',
    'Brunch (1)',
    'Popular (4)',
  ])
  await expect(page.locator('.tag-more-btn')).toContainText('More (')

  // Survives browser reload
  await page.reload()
  await expect(page.locator('.tag-filter-btn')).toHaveText([
    'MidnightSnack (1)',
    'Brunch (1)',
    'Popular (4)',
  ])

  // Show all disables cutoff and hides More
  await page.goto('/settings?section=recipe-tags')
  await panel.getByLabel('Show all tags', { exact: true }).check()
  await expect(panel.getByLabel('Top tags to show', { exact: true })).toBeDisabled()
  await page.goto('/recipes')
  await expect(page.locator('.tag-more-btn')).toHaveCount(0)
})
