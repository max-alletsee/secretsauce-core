import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

function localDay(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-CA')
}

const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

test('Timeline recurring widget creates, edits, approves, and dismisses recipe and note rules', async ({
  page,
  request,
}) => {
  await login(page)
  const result = await request.post('/api/recipes', {
    data: { title: 'Weekly browser lentil soup', language: 'en' },
  })
  expect(result.status()).toBe(201)
  const recipe = await result.json()

  // Calculate expected household default servings from members
  const membersRes = await request.get('/api/members')
  const members = await membersRes.json()
  const memberList = Array.isArray(members) ? members : members.items || []
  const expectedDefaultServings =
    Math.round(
      memberList.reduce((acc: number, m: any) => acc + (Number(m.serving_ratio) || 1), 0) * 100
    ) / 100 || 2

  const todayWeekdayName = names[new Date().getDay()]
  let recipeRuleId: string | undefined
  let noteRuleId: string | undefined

  try {
    await page.goto('/timeline')
    const widget = page.locator('.recurring-meals-widget')
    await expect(widget).toBeVisible()

    // 1. Add a recurring recipe rule for today's weekday
    await widget.getByRole('button', { name: 'Add recurring meal', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Servings', { exact: true })).toHaveValue(
      String(expectedDefaultServings)
    )
    await dialog.getByLabel('Weekday', { exact: true }).click()
    await page.getByRole('option', { name: todayWeekdayName, exact: true }).click()
    await dialog.getByLabel('Meal slot', { exact: true }).click()
    await page.getByRole('option', { name: 'Dinner', exact: true }).click()
    await dialog.getByLabel('Search recipes', { exact: true }).fill('Weekly browser lentil')
    const resultRow = dialog.locator('.recipe-result').filter({ hasText: recipe.title })
    await resultRow.getByRole('button', { name: 'Select', exact: true }).click()
    await dialog.getByRole('button', { name: 'Add recurring meal', exact: true }).click()
    await expect(dialog).not.toBeVisible()

    await expect(widget).toContainText(
      `Every ${todayWeekdayName} · Dinner · ${recipe.title} (${expectedDefaultServings} servings)`
    )
    const rulesAfterCreate = await (await request.get('/api/x/core-recurring/rules')).json()
    const createdRule = rulesAfterCreate.find((r: any) => r.recipe_id === recipe.id)
    expect(createdRule).toBeTruthy()
    recipeRuleId = createdRule.id

    // Verify no timeline entry was auto-created yet
    const beforeApprove = (
      await (await request.get(`/api/timeline?from=${localDay()}&to=${localDay(13)}`)).json()
    ).filter((e: any) => e.recipe_id === recipe.id)
    expect(beforeApprove).toHaveLength(0)

    // 2. Ghost card is visible in today's dinner slot -> Approve it
    const todayDinnerSlot = page.locator('.day-card.is-today .meal-slot[data-slot-id="dinner"]')
    const ghostCard = todayDinnerSlot
      .locator('.recurring-ghost-card')
      .filter({ hasText: recipe.title })
    await expect(ghostCard).toBeVisible()
    await ghostCard.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(ghostCard).toHaveCount(0)

    // Approved meal is now a TimelineCard with the pi-replay icon and no Repeat weekly menuitem
    const approvedCard = todayDinnerSlot.locator('.timeline-card').filter({ hasText: recipe.title })
    await expect(approvedCard).toBeVisible()
    await expect(approvedCard.locator('.pi-replay')).toBeVisible()
    await approvedCard.click()
    await expect(page.getByRole('menuitem', { name: /^Repeat every / })).toHaveCount(0)
    await page.keyboard.press('Escape')

    // 3. Add a recurring note rule for today's weekday + dinner (even though the slot is now occupied!)
    await widget.getByRole('button', { name: 'Add recurring meal', exact: true }).click()
    const noteDialog = page.getByRole('dialog')
    await noteDialog.getByLabel('Weekday', { exact: true }).click()
    await page.getByRole('option', { name: todayWeekdayName, exact: true }).click()
    await noteDialog.getByLabel('Meal slot', { exact: true }).click()
    await page.getByRole('option', { name: 'Dinner', exact: true }).click()
    await noteDialog.getByRole('tab', { name: 'Note', exact: true }).click()
    await noteDialog.getByLabel('Note title', { exact: true }).fill('Homemade garlic bread')
    await noteDialog.getByRole('button', { name: 'Add recurring meal', exact: true }).click()
    await expect(noteDialog).not.toBeVisible()

    const rulesWithNote = await (await request.get('/api/x/core-recurring/rules')).json()
    const noteRule = rulesWithNote.find((r: any) => r.title === 'Homemade garlic bread')
    expect(noteRule).toBeTruthy()
    noteRuleId = noteRule.id

    // Note ghost card appears in today's occupied dinner slot -> Dismiss it
    const noteGhost = todayDinnerSlot
      .locator('.recurring-ghost-card')
      .filter({ hasText: 'Homemade garlic bread' })
    await expect(noteGhost).toBeVisible()
    await noteGhost.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await expect(noteGhost).toHaveCount(0)

    // 4. Edit the note rule -> future dismissal is cleared and updated ghost card appears
    const noteRow = widget.locator('.recurring-rule-item').filter({ hasText: 'Homemade garlic bread' })
    await noteRow.getByRole('button', { name: 'Edit', exact: true }).click()
    const editDialog = page.getByRole('dialog')
    await editDialog.getByLabel('Note title', { exact: true }).fill('Cheesy garlic bread')
    await editDialog.getByRole('button', { name: 'Save recurring meal', exact: true }).click()
    await expect(editDialog).not.toBeVisible()
    await expect(widget).toContainText('Cheesy garlic bread')

    const editedGhost = todayDinnerSlot
      .locator('.recurring-ghost-card')
      .filter({ hasText: 'Cheesy garlic bread' })
    await expect(editedGhost).toBeVisible()

    // 5. Delete the recipe rule -> the already-approved schedule card on today stays intact!
    const recipeRow = widget.locator('.recurring-rule-item').filter({ hasText: recipe.title })
    await recipeRow.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(recipeRow).toHaveCount(0)
    recipeRuleId = undefined
    await expect(approvedCard).toBeVisible()
  } finally {
    if (recipeRuleId) await request.delete(`/api/x/core-recurring/rules/${recipeRuleId}`)
    if (noteRuleId) await request.delete(`/api/x/core-recurring/rules/${noteRuleId}`)
  }
})
