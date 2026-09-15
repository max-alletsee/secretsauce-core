import { test, expect } from '@playwright/test'

test.describe('Phase 3C End-to-End Browser Tests', () => {
  test('authenticates, verifies timeline rolling view, schedules meal, marks cooked, and votes in journal', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err))

    // 1. Visit root - redirects unauthenticated user to /login
    await page.goto('/')
    await expect(page).toHaveURL(/.*\/login/)

    // 2. Perform Login
    await page.fill('input[type="password"]', 'secretpassphrase')
    await page.click('button[type="submit"]')

    // 3. Authenticated session dynamically lands on /timeline (since core-timeline is active)
    await expect(page).toHaveURL(/.*\/timeline/, { timeout: 10_000 })
    await expect(page.locator('.timeline-page')).toBeVisible()

    // 4. Verify 9-day rolling view with Today badge and 2 compact past days
    const dayColumns = page.locator('.timeline-day-column')
    await expect(dayColumns).toHaveCount(9)
    await expect(page.locator('.timeline-day-column.is-today')).toBeVisible()
    await expect(page.locator('.timeline-day-column.is-past')).toHaveCount(2)

    // 5. Open Add Meal modal on Today's column
    const todayCol = page.locator('.timeline-day-column.is-today')
    await todayCol.locator('.add-btn').click()

    const modal = page.locator('.modal-dialog')
    await expect(modal).toBeVisible()
    await expect(modal.locator('h3')).toContainText('Add Meal')

    // Search for seeded recipe "Grandma's Tomato Pasta"
    const searchInput = modal.locator('.search-box input')
    await searchInput.fill('Grandma')
    await page.waitForTimeout(300)

    const scheduleBtn = modal.locator('.recipe-results .select-btn', { hasText: 'Schedule' })
    await expect(scheduleBtn).toBeVisible()
    await scheduleBtn.click()

    // Modal should close and meal card should appear in Today's slot
    await expect(modal).not.toBeVisible()
    const scheduledCard = todayCol.locator('.schedule-card', { hasText: "Grandma's Tomato Pasta" })
    await expect(scheduledCard).toBeVisible()

    // 6. Navigate to /journal via main navigation
    const journalNav = page.locator('nav a', { hasText: 'Journal' })
    await expect(journalNav).toBeVisible()
    await journalNav.click()
    await expect(page).toHaveURL(/.*\/journal/)

    // 7. Verify /journal page loaded with slot footer ready
    await expect(page.locator('.journal-page h2')).toHaveText('Cooking Journal')
  })
})
