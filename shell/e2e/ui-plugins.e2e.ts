import type { Page } from '@playwright/test'
import { test, expect } from './helpers/state'
import { login, chooseMember } from './helpers/ui'

test.use({ actionTimeout: 5000 })

async function createRecipe(page: Page, data: Record<string, unknown>) {
  const response = await page.request.post('/api/recipes', { data: { language: 'en', ...data } })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}

async function plannedMeal(page: Page, title: string) {
  await login(page)
  const date = await page.evaluate(() => {
    const day = new Date()
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  })
  const response = await page.request.post('/api/schedule', { data: { date, meal_type: 'dinner', title, servings_override: 3 } })
  expect(response.status()).toBe(201)
  const entry = await response.json()
  await page.getByRole('link', { name: 'Timeline', exact: true }).first().click()
  await page.reload()
  const card = page.locator('.schedule-card').filter({ hasText: title })
  await expect(card).toBeVisible()
  return { entry, card }
}

test('translation_is_reachable_from_recipe_actions', async ({ page }) => {
  await login(page)
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
  const source = await (await page.request.post('/api/recipes', { data: { title: 'Translation source pasta', language: 'en', ingredients: [{ name: 'Tomatoes', quantity: 400, unit: 'g' }], steps: [{ instruction: 'Cook pasta.' }] } })).json()
  try {
    await page.goto(`/recipes/${source.id}`)
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Translate…', exact: true }).click()
    await page.getByRole('combobox', { name: 'Target language' }).click()
    await page.getByRole('option', { name: 'Spanish', exact: true }).click()
    await page.getByRole('button', { name: 'Translate recipe', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Pasta traducida', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.locator('.recipe-detail-page')).toContainText('Tomates')
    await expect(page.locator('.recipe-detail-page')).toContainText('Cocinar la pasta.')
    const translated = await (await page.request.get(new URL(page.url()).pathname.replace('/recipes/', '/api/recipes/'))).json()
    expect(translated.language).toBe('es')
    expect(translated.group_id).toBe(source.group_id)
  } finally {
    await page.request.delete(`/api/recipes/${source.group_id}`)
  }
})

test('translator explains unavailable AI without losing the source', async ({ page }) => {
  await login(page)
  const source = await (await page.request.post('/api/recipes', { data: { title: 'Unavailable translation source', language: 'en' } })).json()
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: '' } })
  try {
    await page.goto(`/recipes/${source.id}`)
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Translate…', exact: true }).click()
    await page.getByRole('button', { name: 'Translate recipe', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('AI isn’t set up yet')
    await page.getByRole('button', { name: 'Open AI settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\?section=core-ai-provider$/)
    await expect(page.locator('#settings-core-ai-provider').getByLabel('Model name', { exact: true })).toBeVisible()
    expect((await page.request.get(`/api/recipes/${source.id}`)).status()).toBe(200)
  } finally {
    await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
    await page.request.delete(`/api/recipes/${source.group_id}`)
  }
})

test('planner uses household slots and schedules through its rendered sidebar', async ({ page }) => {
  await login(page)
  const household = await (await page.request.get('/api/household')).json()
  await page.request.put('/api/x/core-ai-provider/settings', { data: { provider: 'openai', openai_api_key: 'e2e-test-key' } })
  await page.request.patch('/api/household', { data: { meal_types: [{ id: 'supper', label: 'Evening supper' }] } })
  let suggestion: any
  try {
    await page.goto('/timeline')
    const planner = page.locator('.meal-planner-widget')
    await expect(planner).toBeVisible()
    await planner.getByRole('combobox', { name: 'Meal slot', exact: true }).click()
    await expect(page.getByRole('option', { name: 'Evening supper', exact: true })).toBeVisible()
    await page.getByRole('option', { name: 'Evening supper', exact: true }).click()
    const generated = page.waitForResponse(response => response.url().endsWith('/core-meal-planner-ai/generate') && response.request().method() === 'POST')
    await planner.getByRole('button', { name: 'Generate suggestions', exact: true }).click()
    suggestion = (await (await generated).json()).suggestions[0]
    await expect(planner).toContainText(suggestion.recipe_title)
    await planner.getByRole('button', { name: 'Add to schedule', exact: true }).first().click()
    await expect(planner).toContainText('Scheduled')
    const plan = await (await page.request.get(`/api/x/core-meal-planner-ai/plans/${suggestion.plan_id}`)).json()
    suggestion = plan.suggestions[0]
    const entry = await (await page.request.get(`/api/schedule/${suggestion.schedule_entry_id}`)).json()
    expect(entry.recipe_id).toBe(suggestion.recipe_id)
    expect(entry.meal_type).toBe('supper')
  } finally {
    await page.request.patch('/api/household', { data: { meal_types: household.meal_types } })
    if (suggestion?.schedule_entry_id) {
      const entry = await (await page.request.get(`/api/schedule/${suggestion.schedule_entry_id}`)).json()
      await page.request.delete(`/api/schedule/${entry.id}?revision=${entry.revision}`)
    }
  }
})

test('shopping navigation aggregates scheduled quantities and keeps checked state after reload', async ({ page }) => {
  await login(page)
  const recipe = await createRecipe(page, { title: 'Shopping test soup', servings: 2, ingredients: [{ name: 'Shopping test carrots', quantity: 200, unit: 'g' }] })
  const date = await page.evaluate(() => new Date().toLocaleDateString('en-CA'))
  const entry = await (await page.request.post('/api/schedule', { data: { date, meal_type: 'dinner', recipe_id: recipe.id, servings_override: 4 } })).json()
  let manual: any
  try {
    await page.getByRole('link', { name: 'Shopping list', exact: true }).first().click()
    await expect(page).toHaveURL(/\/shopping-list$/)
    const item = page.locator('.shopping-item').filter({ hasText: 'Shopping test carrots' })
    await expect(item).toContainText('400 g')
    await item.getByRole('checkbox').check()
    await page.reload()
    await expect(item.getByRole('checkbox')).toBeChecked()
    await page.getByLabel('Extra item name', { exact: true }).fill('Browser test coffee')
    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    const extra = page.locator('.shopping-item').filter({ hasText: 'Browser test coffee' })
    await expect(extra).toBeVisible()
    const rows = await (await page.request.get('/api/x/core-shopping-list')).json()
    manual = rows.items.find((row: any) => row.name === 'Browser test coffee')
    await extra.getByRole('checkbox').check()
    await page.reload()
    await expect(extra.getByRole('checkbox')).toBeChecked()
  } finally {
    await page.request.post('/api/x/core-shopping-list/toggle', { data: { key: 'shopping test carrots_g', checked: false } })
    if (manual) await page.request.delete(`/api/x/core-shopping-list/items/${manual.id}`)
    await page.request.delete(`/api/schedule/${entry.id}?revision=${entry.revision}`)
    await page.request.delete(`/api/recipes/${recipe.group_id}`)
  }
})

test('recipe search sends the query to the kernel and hides unrelated recipes', async ({ page }) => {
  await login(page)
  const matching = await createRecipe(page, { title: 'Unique basil search recipe' })
  const other = await createRecipe(page, { title: 'Unrelated oatmeal search recipe' })
  try {
    await page.goto('/recipes')
    await expect(page.locator('.recipe-card').filter({ hasText: other.title })).toBeVisible()
    await page.locator('input[type=search]').fill('Unique basil')
    await expect(page.locator('.recipe-card').filter({ hasText: matching.title })).toBeVisible()
    await expect(page.locator('.recipe-card').filter({ hasText: other.title })).toHaveCount(0)
  } finally {
    await page.request.delete(`/api/recipes/${matching.group_id}`)
    await page.request.delete(`/api/recipes/${other.group_id}`)
  }
})

test('shortlist action persists and sidebar link uses shell navigation', async ({ page }) => {
  await login(page)
  const recipe = await createRecipe(page, { title: 'Sidebar test recipe' })
  try {
    await page.goto(`/recipes/${recipe.id}`)
    await page.getByRole('button', { name: 'Add to shortlist', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Remove from shortlist', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Timeline', exact: true }).first().click()
    await page.evaluate(() => { (window as any).__shortlistSentinel = 'alive' })
    await page.locator('.shortlist-sidebar').getByRole('link', { name: 'Sidebar test recipe', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/recipes/${recipe.id}$`))
    expect(await page.evaluate(() => (window as any).__shortlistSentinel)).toBe('alive')
  } finally {
    await page.request.delete(`/api/x/core-shortlist/${recipe.id}`)
    await page.request.delete(`/api/recipes/${recipe.group_id}`)
  }
})

test('ratings use the actual selected member and reload the per-member vote', async ({ page }) => {
  await login(page)
  const members = await (await page.request.get('/api/members')).json()
  const member = members.find((row: any) => row.name === 'Alex')
  const date = await page.evaluate(() => new Date().toLocaleDateString('en-CA'))
  const entry = await (await page.request.post('/api/journal', { data: { date, meal_type: 'dinner', title: 'Ratings test meal', servings_cooked: 2 } })).json()
  try {
    await page.goto('/journal')
    await chooseMember(page, member.name)
    const card = page.locator('.journal-entry-card').filter({ hasText: 'Ratings test meal' })
    await card.locator('.upvote-btn').click()
    await expect.poll(async () => (await (await page.request.get(`/api/x/core-ratings?journal_id=${entry.id}`)).json()).scores).toEqual([{ member_id: member.id, score: 1 }])
    await page.reload()
    await expect(card.locator('.upvote-btn')).toHaveAttribute('aria-pressed', 'true')
    await card.locator('.upvote-btn').click()
    await expect.poll(async () => (await (await page.request.get(`/api/x/core-ratings?journal_id=${entry.id}`)).json()).scores).toEqual([])
  } finally {
    await page.request.delete(`/api/x/core-ratings?journal_id=${entry.id}&member_id=${member.id}`)
    await page.request.delete(`/api/journal/${entry.id}?revision=${entry.revision}`)
  }
})

test('mark_cooked_uses_the_real_outbox_and_persists', async ({ page }) => {
  const { entry, card } = await plannedMeal(page, 'Outbox kitchen meal')
  await card.click()
  await page.getByRole('menuitem', { name: 'Mark as cooked', exact: true }).click({ timeout: 5000 })
  await expect.poll(async () => {
    const rows = await (await page.request.get(`/api/journal?from=${entry.date}&to=${entry.date}`)).json()
    return rows.filter((row: any) => row.schedule_entry_id === entry.id)
  }).toHaveLength(1)
  await page.reload()
  await expect(page.locator('.schedule-card').filter({ hasText: 'Outbox kitchen meal' }).getByTitle('Cooked')).toBeVisible()
  await page.getByRole('link', { name: 'Journal', exact: true }).first().click()
  await expect(page.locator('.journal-page')).toContainText('Outbox kitchen meal')
  await expect(page.locator('.journal-entry-card').filter({ hasText: 'Outbox kitchen meal' })).toContainText('3 servings')
})

test('removing a planned meal confirms, persists and does not reload the document', async ({ page }) => {
  const { entry, card } = await plannedMeal(page, 'Remove kitchen meal')
  await page.evaluate(() => { (window as any).__uiSentinel = 'alive' })
  await card.click()
  await page.getByRole('menuitem', { name: 'Remove from plan', exact: true }).click({ timeout: 5000 })
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('alertdialog')).not.toBeVisible()
  await expect(card).toBeVisible()
  await card.click()
  await page.getByRole('menuitem', { name: 'Remove from plan', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(card).toHaveCount(0)
  expect((await page.request.get(`/api/schedule/${entry.id}`)).status()).toBe(404)
  expect(await page.evaluate(() => (window as any).__uiSentinel)).toBe('alive')
})
