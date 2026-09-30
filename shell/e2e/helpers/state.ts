import { test as base, expect, type APIRequestContext } from '@playwright/test'

async function json(request: APIRequestContext, path: string) {
  const response = await request.get(path)
  expect(response.ok(), `${path}: ${await response.text()}`).toBe(true)
  return response.json()
}
function localDate(offset: number) {
  const date = new Date(); date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** A separate authenticated client keeps cleanup available even after browser errors/logout. */
export const test = base.extend<{ isolatedState: void }>({
  isolatedState: [async ({ request }, use) => {
    const login = await request.post('/api/auth/login', { data: { passphrase: 'secretpassphrase' } })
    expect(login.status()).toBe(200)
    const range = `?from=${localDate(-20)}&to=${localDate(20)}`
    const [household, ai, recipes, schedule, journal, shortlist, shopping, members] = await Promise.all([
      json(request, '/api/household'), json(request, '/api/x/core-ai-provider/settings'), json(request, '/api/recipes?limit=200'),
      json(request, `/api/schedule${range}`), json(request, `/api/journal${range}`), json(request, '/api/x/core-shortlist'),
      json(request, '/api/x/core-shopping-list'), json(request, '/api/members'),
    ])
    expect(recipes.total).toBeLessThanOrEqual(200)
    try { await use() }
    finally {
      // Remove dependent writes before their recipe/member rows, using current revisions.
      for (const [noun, before] of [['journal', journal], ['schedule', schedule]] as const) {
        const ids = new Set(before.map((row: any) => row.id))
        for (const row of await json(request, `/api/${noun}${range}`)) {
          if (!ids.has(row.id)) expect((await request.delete(`/api/${noun}/${row.id}?revision=${row.revision}`)).status()).toBe(204)
        }
      }
      const shortlistIds = new Set(shortlist.map((row: any) => row.recipe_id))
      const afterShortlist = await json(request, '/api/x/core-shortlist')
      for (const row of afterShortlist) if (!shortlistIds.has(row.recipe_id)) await request.delete(`/api/x/core-shortlist/${row.recipe_id}`)
      for (const row of shortlist) if (!afterShortlist.some((current: any) => current.recipe_id === row.recipe_id)) await request.post('/api/x/core-shortlist', { data: { recipe_id: row.recipe_id } })
      const beforeGroups = new Set(recipes.items.map((row: any) => row.group_id))
      const afterRecipes = await json(request, '/api/recipes?limit=200')
      for (const group of new Set<string>(afterRecipes.items.map((row: any) => row.group_id))) if (!beforeGroups.has(group)) expect((await request.delete(`/api/recipes/${group}`)).status()).toBe(204)
      const memberIds = new Set(members.map((row: any) => row.id))
      for (const row of await json(request, '/api/members')) if (!memberIds.has(row.id)) expect((await request.delete(`/api/members/${row.id}?revision=${row.revision}`)).status()).toBe(204)
      const manualIds = new Set(shopping.items.filter((row: any) => row.source_type === 'manual').map((row: any) => row.id))
      for (const row of (await json(request, '/api/x/core-shopping-list')).items) {
        if (row.source_type === 'manual' && !manualIds.has(row.id)) await request.delete(`/api/x/core-shopping-list/items/${row.id}`)
      }
      for (const row of shopping.items) await request.post('/api/x/core-shopping-list/toggle', { data: { key: row.key, checked: row.checked } })
      const { household_name, meal_types, languages, units } = household
      expect((await request.patch('/api/household', { data: { household_name, meal_types, languages, units } })).ok()).toBe(true)
      // GET masks credentials; this child server's only configured key is our known fixture value.
      expect((await request.put('/api/x/core-ai-provider/settings', { data: { ...ai, openai_api_key: ai.openai_api_key ? 'e2e-test-key' : '' } })).ok()).toBe(true)
    }
  }, { auto: true, timeout: 30000 }],
})
export { expect }
