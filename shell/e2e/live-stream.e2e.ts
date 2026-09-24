import { test, expect } from '@playwright/test'

test.describe('Live event stream', () => {
  test('a write made elsewhere reaches the open shell over SSE', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="password"]', 'secretpassphrase')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*\/timeline/, { timeout: 10_000 })

    // Connected: the stream's hello frame arrived, so no offline bar.
    await expect(page.getByText('Offline, showing saved data')).toHaveCount(0)

    // The timeline plugin re-fetches the schedule on schedule:* events.
    const refetch = page.waitForRequest((r) => r.url().includes('/api/schedule?from='), {
      timeout: 10_000,
    })
    const inTwelveDays = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10)
    const created = await page.request.post('/api/schedule', {
      data: { date: inTwelveDays, meal_type: 'breakfast', title: 'Written by another device' },
    })
    expect(created.status()).toBe(201)
    await refetch
  })
})
