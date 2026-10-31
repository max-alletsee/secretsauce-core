import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test('a write made elsewhere visibly reaches the open shell over SSE', async ({ page, request }) => {
  await login(page)
  await expect(page.getByText('Offline, showing saved data')).toHaveCount(0)
  const date = new Date().toLocaleDateString('en-CA')
  const response = await request.post('/api/timeline', {data:{date,meal_type:'dinner',entry_type:'note',title:'Written by another device'}})
  expect(response.status()).toBe(201)
  const entry = await response.json()
  const card = page.locator('.day-card.is-today .schedule-card').filter({hasText:'Written by another device'})
  await expect(card).toBeVisible()
  expect((await request.delete(`/api/timeline/${entry.id}?revision=${entry.revision}`)).status()).toBe(204)
  await expect(card).toHaveCount(0)
})
