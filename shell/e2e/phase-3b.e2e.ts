import { test, expect } from '@playwright/test'

test.describe('Phase 3B End-to-End Browser Tests', () => {
  test('authenticates, boots plugins, verifies member picker, recipe scaling, shortlisting, and creation', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err))

    // 1. Visit root - redirects unauthenticated user to /login
    await page.goto('/')
    await expect(page).toHaveURL(/.*\/login/)
    await expect(page.locator('h2')).toHaveText('SecretSauce Login')

    // 2. Perform Login
    await page.fill('input[type="password"]', 'secretpassphrase')
    await page.click('button[type="submit"]')

    // 3. Authenticated session lands; navigate to /recipes
    await page.waitForURL(/(timeline|recipes)/, { timeout: 10_000 })
    await page.locator('nav a', { hasText: 'Recipes' }).click()
    await expect(page).toHaveURL(/.*\/recipes/, { timeout: 10_000 })
    await expect(page.locator('.household-title')).toHaveText('SecretSauce E2E House')

    // 4. Verify core-members plugin injected MemberPicker into shell.header.right
    const memberPicker = page.locator('.ss-member-picker')
    await expect(memberPicker).toBeVisible()
    const memberSelect = memberPicker.locator('.member-select')
    await expect(memberSelect).toBeVisible()
    await expect(memberSelect.locator('option')).toHaveCount(3) // All Members, Alex, Charlie

    // Switch active member to Charlie
    await memberSelect.selectOption({ label: 'Charlie' })
    await expect(memberSelect).toHaveValue(/^[a-zA-Z0-9_-]+$/)

    // 5. Verify core-recipes list page and shortlist plugin filter slot
    await expect(page.locator('.recipe-list-page h1')).toHaveText('Recipes')
    const shortlistFilter = page.locator('.shortlist-filter-chip')
    await expect(shortlistFilter).toBeVisible()
    await expect(shortlistFilter).toHaveText('★ Shortlist')

    // Verify initial recipe card exists
    const card = page.locator('.recipe-card', { hasText: "Grandma's Tomato Pasta" })
    await expect(card).toBeVisible()
    await expect(card.locator('.tag', { hasText: 'italian' })).toBeVisible()

    // Shortlist action slot inside card
    const cardShortlistBtn = card.locator('.btn-shortlist')
    await expect(cardShortlistBtn).toBeVisible()
    await expect(cardShortlistBtn).not.toHaveClass(/active/)

    // 6. Navigate to recipe detail by clicking card
    await card.click()
    await expect(page).toHaveURL(/.*\/recipes\/[a-zA-Z0-9_-]+/)
    await expect(page.locator('.recipe-detail-page h1')).toHaveText("Grandma's Tomato Pasta")

    // 7. Test Serving Scaler with dynamic @secretsauce/units calculation
    const servingsValue = page.locator('.servings-value')
    await expect(servingsValue).toHaveText('2')

    const spaghettiItem = page.locator('.ingredient-item', { hasText: 'Spaghetti' })
    await expect(spaghettiItem.locator('strong')).toHaveText('200')

    // Scale up to 3 servings (200g -> 300g)
    await page.locator('.btn-scaler-plus').click()
    await expect(servingsValue).toHaveText('3')
    await expect(spaghettiItem.locator('strong')).toHaveText('300')

    // Scale down back to 2 servings
    await page.locator('.btn-scaler-minus').click()
    await expect(servingsValue).toHaveText('2')
    await expect(spaghettiItem.locator('strong')).toHaveText('200')

    // 8. Toggle Shortlist Favorite on Recipe Detail
    const detailShortlistBtn = page.locator('.detail-actions .btn-shortlist')
    await expect(detailShortlistBtn).toBeVisible()
    await detailShortlistBtn.click()
    await expect(detailShortlistBtn).toHaveClass(/active/)

    // 9. Go back to recipe list and test shortlist filter
    await page.locator('.btn-back').click()
    await expect(page).toHaveURL(/.*\/recipes$/)

    // Verify card now has active star
    const updatedCard = page.locator('.recipe-card', { hasText: "Grandma's Tomato Pasta" })
    await expect(updatedCard.locator('.btn-shortlist')).toHaveClass(/active/)

    // Filter by shortlist
    await shortlistFilter.click()
    await expect(shortlistFilter).toHaveClass(/active/)
    await expect(page.locator('.recipe-card')).toHaveCount(1)

    // Unfilter
    await shortlistFilter.click()
    await expect(shortlistFilter).not.toHaveClass(/active/)

    // 10. Create new recipe via Intent Trigger
    const addIntentBtn = page.locator('.recipe-list-page .ss-intent-trigger', {
      hasText: '+ Add / Import Recipe',
    })
    await expect(addIntentBtn).toBeVisible()
    await addIntentBtn.click()

    // Expect navigation to /recipes/new
    await expect(page).toHaveURL(/.*\/recipes\/new/)
    await expect(page.locator('.recipe-edit-page h2')).toHaveText('New Recipe')

    // Fill form
    await page.locator('.input-title').fill('Fluffy Blueberry Pancakes')
    await page.locator('.textarea').fill('Delicious homemade breakfast pancakes')

    // Add ingredient
    await page.locator('.btn-add-ingredient').click()
    const ingRow = page.locator('.ingredient-row').first()
    await ingRow.locator('.input-qty').fill('300')
    await ingRow.locator('.select-unit').selectOption('g')
    await ingRow.locator('.input-name').fill('Flour')

    // Add step
    await page.locator('.btn-add-step').click()
    const stepRow = page.locator('.step-row').first()
    await stepRow.locator('.textarea-instruction').fill('Mix dry and wet ingredients gently.')

    // Save recipe
    await page.locator('.actions-row button').click()

    // Expect transition to detail view for newly created recipe
    await expect(page).toHaveURL(/.*\/recipes\/[a-zA-Z0-9_-]+/, { timeout: 10_000 })
    await expect(page.locator('.recipe-detail-page h1')).toHaveText('Fluffy Blueberry Pancakes')
    await expect(page.locator('.ingredient-item', { hasText: 'Flour' })).toBeVisible()
  })
})
