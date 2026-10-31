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
    const [household, ai, recipes, timeline, shortlist, shopping, members] = await Promise.all([
      json(request, '/api/household'), json(request, '/api/x/core-ai-provider/settings'), json(request, '/api/recipes?limit=200'),
      json(request, `/api/timeline${range}`), json(request, '/api/x/core-shortlist'),
      json(request, '/api/x/core-shopping-list'), json(request, '/api/members'),
    ])
    const slotsBefore = await json(request, `/api/x/core-timeline/slots${range}`)
    const rulesBefore = await json(request, '/api/x/core-recurring/rules')
    expect(recipes.total).toBeLessThanOrEqual(200)
    try { await use() }
    finally {
      // Stop newly created recurring plans before removing their scheduled meals.
      const ruleIds = new Set(rulesBefore.map((row:any)=>row.id))
      for (const rule of await json(request, '/api/x/core-recurring/rules')) {
        if (!ruleIds.has(rule.id)) expect((await request.delete(`/api/x/core-recurring/rules/${rule.id}`)).ok()).toBe(true)
      }
      // Remove dependent writes before their recipe/member rows, using current revisions.
      const timelineIds = new Set(timeline.map((row: any) => row.id))
      for (const row of await json(request, `/api/timeline${range}`)) {
        if (!timelineIds.has(row.id)) expect((await request.delete(`/api/timeline/${row.id}?revision=${row.revision}`)).status()).toBe(204)
      }
      const slotsAfter = await json(request, `/api/x/core-timeline/slots${range}`)
      for (const [date, after] of Object.entries<any[]>(slotsAfter.days)) {
        const before: any[] = slotsBefore.days[date] || []
        const overrides = (slots: any[]) => slots.filter(slot => slot.kind === 'extra' || slot.skipped)
        if (JSON.stringify(overrides(after)) === JSON.stringify(overrides(before))) continue
        for (const slot of overrides(after)) expect((await request.delete(`/api/x/core-timeline/days/${date}/slots/${slot.id}?with_entries=true`)).ok()).toBe(true)
        for (const slot of overrides(before)) {
          const nextDefault = before.slice(before.indexOf(slot) + 1).find(row => row.kind === 'default')
          const body = slot.kind === 'extra' ? { kind: 'extra', label: slot.label, before: nextDefault?.id || null } : { kind: 'skip' }
          expect((await request.put(`/api/x/core-timeline/days/${date}/slots/${slot.id}`, { data: body })).ok()).toBe(true)
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
      const afterMembers = await json(request, '/api/members')
      for (const row of afterMembers) if (!memberIds.has(row.id)) expect((await request.delete(`/api/members/${row.id}?revision=${row.revision}`)).status()).toBe(204)
      for (const before of members) {
        const current = afterMembers.find((row: any) => row.id === before.id)
        if (current && current.revision !== before.revision) {
          const { name, avatar_color, serving_ratio, dietary_restrictions, allergies, disliked_ingredients, favorite_cuisines, preferred_language } = before
          expect((await request.patch(`/api/members/${before.id}`, { data: { revision: current.revision, name, avatar_color, serving_ratio, dietary_restrictions, allergies, disliked_ingredients, favorite_cuisines, preferred_language } })).ok()).toBe(true)
        }
      }
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
