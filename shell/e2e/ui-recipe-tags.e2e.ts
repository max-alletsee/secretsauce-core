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
