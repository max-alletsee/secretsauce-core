import { test, expect } from './helpers/state'
import { login, chooseMember } from './helpers/ui'
function day(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

test('window_extends_and_today_resets_without_persistence', async ({ page }) => {
  await login(page)
  await page.goto('/timeline')
  await expect(page.locator('[data-timeline-date]')).toHaveCount(9)
  await page.getByRole('button', {name:'Show 4 earlier days',exact:true}).click()
  await expect(page.locator('[data-timeline-date]')).toHaveCount(13)
  await page.getByRole('button', {name:'Show 5 more days',exact:true}).click()
  await expect(page.locator('[data-timeline-date]')).toHaveCount(18)
  await page.getByRole('button', {name:'Today',exact:true}).click()
  await expect(page.locator('[data-timeline-date]')).toHaveCount(9)
  const past = page.locator('.past-day-line').first()
  await past.click(); await expect(page.locator('.past-days .day-card')).toHaveCount(1)
  await past.click(); await expect(page.locator('.past-days .day-card')).toHaveCount(0)
})

test('repeated window expansion loads slots and meals beyond 92 days', async ({ page }) => {
  await login(page)
  const remoteDay = day(91)
  const response = await page.request.post('/api/timeline', {data:{date:remoteDay,meal_type:'dinner',entry_type:'note',title:'Far future meal'}})
  expect(response.status()).toBe(201)
  const entry = await response.json()
  try {
  await page.goto('/timeline')
  await expect(page.locator('[data-timeline-date]')).toHaveCount(9)
  for (let i = 0; i < 17; i++) {
    const loaded = page.waitForResponse(response => response.url().includes('/api/x/core-timeline/slots?'))
    await page.getByRole('button', {name:'Show 5 more days',exact:true}).click()
    await loaded
  }
  await expect(page.locator('[data-timeline-date]')).toHaveCount(94)
  const remote = page.locator(`.day-card[data-timeline-date="${remoteDay}"]`)
  await expect(remote).toContainText('Far future meal')
  await expect(page.locator('.timeline-page > [data-pc-name=message]')).toHaveCount(0)
  } finally {
    // This date is outside the shared ±20-day fixture; clean up only our row.
    const current = await page.request.get(`/api/timeline/${entry.id}`)
    if (current.ok()) expect((await page.request.delete(`/api/timeline/${entry.id}?revision=${(await current.json()).revision}`)).status()).toBe(204)
  }
})

test('unmatched legacy slots keep meal actions without offering removal of a nonexistent override', async ({ page }) => {
  await login(page)
  expect((await page.request.post('/api/timeline', {data:{date:day(),meal_type:'Late Snack!',entry_type:'note',title:'Legacy snack'}})).status()).toBe(201)
  await page.goto('/timeline')
  const slot = page.locator('.day-card.is-today [data-slot-id="Late Snack!"]')
  await expect(slot).toContainText('Legacy snack')
  const trigger = slot.getByRole('button', {name:'Slot actions',exact:true})
  await trigger.scrollIntoViewIfNeeded(); await trigger.click()
  await expect(page.getByRole('menuitem', {name:'Add another meal',exact:true})).toBeVisible()
  await expect(page.getByRole('menuitem', {name:'Remove slot',exact:true})).toHaveCount(0)
  await page.keyboard.press('Escape')
  await slot.locator('.timeline-card').click()
  await page.getByRole('menuitem', {name:'Remove from plan',exact:true}).click()
  await page.getByRole('alertdialog').getByRole('button', {name:'Remove',exact:true}).click()
  await expect(slot).toHaveCount(0)
})

test('one-off slots, skip undo and exact notes persist through the real Timeline', async ({ page }) => {
  await login(page)
  expect((await page.request.patch('/api/household',{data:{meal_types:[{id:'breakfast',label:'Breakfast'},{id:'lunch',label:'Lunch'},{id:'dinner',label:'Dinner'}]}})).ok()).toBe(true)
  await page.goto('/timeline')
  await expect(page.locator('.timeline-page')).toBeVisible()
  await page.reload()
  const today = page.locator(`.day-card[data-timeline-date="${day()}"]`)
  await expect(today.locator('[data-slot-id]')).toHaveCount(3)
  await today.getByRole('button',{name:'Day actions',exact:true}).click()
  await page.getByRole('menuitem',{name:'Add slot for this day',exact:true}).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Slot name', {exact:true}).fill('Brunch')
  await dialog.getByLabel('Position', {exact:true}).click()
  await page.getByRole('option',{name:'Before Lunch',exact:true}).click()
  await dialog.getByRole('button',{name:'Add slot',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  await expect(today.locator('[data-slot-id]')).toHaveCount(4)
  await expect(today.locator('[data-slot-id]').nth(1)).toHaveAttribute('data-slot-id','brunch')
  await page.getByLabel('Meal slot',{exact:true}).click()
  await expect(page.getByRole('option',{name:'Brunch',exact:true})).toBeVisible()
  await page.getByLabel('Meal slot',{exact:true}).press('Escape')
  await expect(page.getByRole('option',{name:'Brunch',exact:true})).toHaveCount(0)
  const lunch = page.locator(`.day-card[data-timeline-date="${day(1)}"] [data-slot-id=lunch]`)
  const lunchActions = lunch.getByRole('button',{name:'Slot actions',exact:true})
  await lunchActions.scrollIntoViewIfNeeded()
  await expect(lunchActions).toBeInViewport()
  await lunchActions.click()
  await page.getByRole('menuitem',{name:'Skip on this day',exact:true}).click()
  await expect(lunch).toContainText('Skipped this day')
  await lunch.getByRole('button',{name:'Undo',exact:true}).click()
  await expect(lunch).not.toContainText('Skipped this day')
  const brunch = today.locator('[data-slot-id=brunch]')
  await brunch.getByRole('button',{name:'Add meal',exact:true}).click()
  await dialog.getByRole('tab',{name:'Note',exact:true}).click()
  await dialog.getByLabel('Note title',{exact:true}).fill('Dining with neighbours')
  await dialog.getByRole('button',{name:'Add meal',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  await expect(brunch).toContainText('Dining with neighbours')
  const entries = (await (await page.request.get(`/api/timeline?from=${day()}&to=${day()}`)).json())
  expect(entries.find((entry:any)=>entry.meal_type==='brunch').title).toBe('Dining with neighbours')
  await brunch.getByRole('button',{name:'Slot actions',exact:true}).click()
  await page.getByRole('menuitem',{name:'Remove slot',exact:true}).click()
  await expect(page.getByRole('alertdialog')).toContainText('Remove Brunch and its 1 planned meal?')
  await page.getByRole('alertdialog').getByRole('button',{name:'Remove',exact:true}).click()
  await expect(today.locator('[data-slot-id=brunch]')).toHaveCount(0)
  await page.reload(); await expect(today.locator('[data-slot-id=brunch]')).toHaveCount(0)
})

test('another_devices_schedule_write_updates_the_visible_feed', async ({ page, request }) => {
  await login(page); await page.goto('/timeline')
  expect((await request.patch('/api/household',{data:{meal_types:[{id:'breakfast',label:'Breakfast'},{id:'lunch',label:'Lunch'},{id:'dinner',label:'Dinner'}]}})).ok()).toBe(true)
  await page.reload()
  const created = await request.post('/api/timeline',{data:{date:day(),meal_type:'Dinner',entry_type:'note',title:'Live device meal'}})
  expect(created.status()).toBe(201)
  const entry = await created.json()
  const card = page.locator('.timeline-card').filter({hasText:'Live device meal'})
  await expect(card).toBeVisible()
  const updated = await request.patch(`/api/timeline/${entry.id}`,{data:{revision:entry.revision,title:'Renamed live meal'}})
  expect(updated.ok()).toBe(true)
  const current = await updated.json()
  await expect(page.locator('.timeline-card').filter({hasText:'Renamed live meal'})).toBeVisible()
  expect((await request.delete(`/api/timeline/${entry.id}?revision=${current.revision}`)).status()).toBe(204)
  await expect(page.locator('.timeline-card').filter({hasText:'Renamed live meal'})).toHaveCount(0)
  expect((await request.put(`/api/x/core-timeline/days/${day(1)}/slots/lunch`,{data:{kind:'skip'}})).ok()).toBe(true)
  await expect(page.locator(`.day-card[data-timeline-date="${day(1)}"] [data-slot-id=lunch]`)).toContainText('Skipped this day')
})

test('add meal uses the real shortlist, servings and an exact quick-note title', async ({ page }) => {
  await login(page)
  const response = await page.request.post('/api/recipes', {data:{language:'en',title:'Shortlisted Timeline soup'}})
  expect(response.status()).toBe(201)
  const recipe = await response.json()
  const member = (await (await page.request.get('/api/members')).json())[0]
  await chooseMember(page, member.name)
  const shortlisted = await page.request.post('/api/x/core-shortlist', {data:{recipe_id:recipe.id,member_id:member.id}})
  expect(shortlisted.ok(), await shortlisted.text()).toBe(true)
  await page.goto('/timeline')
  const slot = page.locator('.day-card.is-today .meal-slot').first()
  const trigger = slot.getByRole('button', {name:'Slot actions',exact:true})
  await trigger.scrollIntoViewIfNeeded(); await trigger.click()
  await page.getByRole('menuitem', {name:'Add another meal',exact:true}).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Servings', {exact:true}).fill('4.5')
  await dialog.getByRole('tab', {name:'Shortlist',exact:true}).click()
  await expect(dialog).toContainText('Shortlisted Timeline soup')
  await dialog.locator('.recipe-result').filter({hasText:'Shortlisted Timeline soup'}).getByRole('button', {name:'Schedule',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  await expect(slot).toContainText('Shortlisted Timeline soup')
  const scheduled = (await (await page.request.get(`/api/timeline?from=${day()}&to=${day()}`)).json()).find((row:any) => row.recipe_id===recipe.id)
  expect(scheduled.servings_override).toBe(4.5)
  await trigger.scrollIntoViewIfNeeded(); await trigger.click()
  await page.getByRole('menuitem', {name:'Add another meal',exact:true}).click()
  await dialog.getByRole('tab', {name:'Note',exact:true}).click()
  await dialog.getByRole('button', {name:'Leftovers',exact:true}).click()
  await expect(dialog.getByLabel('Note title', {exact:true})).toHaveValue('Leftovers')
  await dialog.getByRole('button', {name:'Add meal',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  await expect(slot).toContainText('Leftovers')
})

test('planner acceptance resolves one-off choices outside its initial loaded dates', async ({ page }) => {
  await login(page)
  const date = day(40)
  expect((await page.request.put(`/api/x/core-timeline/days/${date}/slots/far-brunch`, {data:{kind:'extra',label:'Far brunch'}})).ok()).toBe(true)
  await page.request.put('/api/x/core-ai-provider/settings', {data:{provider:'openai',openai_api_key:'e2e-test-key'}})
  let entryId: string | undefined
  try {
    // Exercise replacement of the AI service, not only its initial instance.
    await page.goto('/settings?section=plugins')
    const aiSwitch = page.locator('[data-plugin-id=core-ai-provider]').getByRole('switch')
    await aiSwitch.uncheck(); await aiSwitch.check()
    await page.getByRole('link', {name:'Timeline',exact:true}).first().click()
    const planner = page.locator('.meal-planner-widget')
    await planner.getByRole('button', {name:'Generate suggestions',exact:true}).click()
    const suggestion = planner.locator('.sug-card').first()
    await suggestion.getByLabel('Schedule date', {exact:true}).fill(date)
    await suggestion.getByLabel('Schedule meal slot', {exact:true}).click()
    await expect(page.getByRole('option', {name:'Far brunch',exact:true})).toBeVisible()
    await page.getByRole('option', {name:'Far brunch',exact:true}).click()
    const accepted = page.waitForResponse(response => response.url().endsWith('/accept'))
    await suggestion.getByRole('button', {name:'Add to schedule',exact:true}).click()
    const response = await accepted
    expect(response.ok()).toBe(true)
    entryId = (await response.json()).timeline_entry_id
    const entry = await (await page.request.get(`/api/timeline/${entryId}`)).json()
    expect(entry.date).toBe(date); expect(entry.meal_type).toBe('far-brunch')
  } finally {
    if (entryId) {
      const entry = await (await page.request.get(`/api/timeline/${entryId}`)).json()
      await page.request.delete(`/api/timeline/${entryId}?revision=${entry.revision}`)
    }
    expect((await page.request.delete(`/api/x/core-timeline/days/${date}/slots/far-brunch`)).ok()).toBe(true)
  }
})

test('returning to Timeline and disabling reenabling it keeps one live feed subscription', async ({ page, request }) => {
  await login(page); await page.goto('/timeline')
  await expect(page.locator('.day-card.is-today [data-slot-id]').first()).toBeVisible()
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole('link', {name:'Recipes',exact:true}).first().click()
    await page.getByRole('link', {name:'Timeline',exact:true}).first().click()
    await expect(page.locator('.day-card.is-today [data-slot-id]').first()).toBeVisible()
  }
  await page.getByRole('link', {name:'Settings',exact:true}).first().click()
  await page.locator('#settings-plugins').getByRole('button', {name:'Plugins',exact:true}).click()
  const control = page.locator('[data-plugin-id=core-timeline]').getByRole('switch')
  try {
    await control.uncheck()
    await expect(page.getByRole('link', {name:'Timeline',exact:true})).toHaveCount(0)
    await control.check()
    await page.getByRole('link', {name:'Timeline',exact:true}).first().click()
    await expect(page.locator('.day-card.is-today [data-slot-id]').first()).toBeVisible()
    const feedReads: string[] = [], warmReads: string[] = []
    page.on('request', req => {
      const url = new URL(req.url())
      if (url.searchParams.get('from') !== day(-2)) return
      if (url.pathname === '/api/x/core-timeline/slots' && url.searchParams.get('to') === day(6)) feedReads.push(req.url())
      if (url.pathname === '/api/timeline' && url.searchParams.get('to') === day(14)) warmReads.push(req.url())
    })
    expect((await request.post('/api/timeline', {data:{date:day(),meal_type:'dinner',entry_type:'note',title:'Single subscription meal'}})).status()).toBe(201)
    await expect(page.locator('.day-card.is-today')).toContainText('Single subscription meal')
    expect(feedReads).toHaveLength(1)
    expect(warmReads).toHaveLength(1)
  } finally { await request.post('/api/plugins/core-timeline/enable') }
})

test.describe('browser-local cache window', () => {
  test.use({timezoneId:'Europe/Berlin'})
  test('cache warming covers the local horizon just after midnight, not the UTC day', async ({page}) => {
    await page.clock.install({time:new Date('2026-10-04T00:30:00+02:00')})
    const queries:URL[]=[]
    page.on('request',req=>{const url=new URL(req.url());if(url.pathname==='/api/timeline')queries.push(url)})
    await login(page)
    await expect(page.locator('.day-card.is-today')).toHaveAttribute('data-timeline-date','2026-10-04')
    await expect.poll(()=>queries.some(url=>url.searchParams.get('from')==='2026-10-02'&&url.searchParams.get('to')==='2026-10-18')).toBe(true)
  })
})

test('phone sidebar precedes the feed, widgets start collapsed, and two meal slots of today fit on iPhone 13', async ({ page, request }) => {
  await page.setViewportSize({width:390,height:844})
  await login(page)
  expect((await request.patch('/api/household',{data:{meal_types:[{id:'breakfast',label:'Breakfast'},{id:'lunch',label:'Lunch'},{id:'dinner',label:'Dinner'}]}})).ok()).toBe(true)
  const createdLunch = await request.post('/api/timeline',{data:{date:day(),meal_type:'lunch',entry_type:'note',title:'Quick noodle bowl',servings_override:2}})
  const createdDinner = await request.post('/api/timeline',{data:{date:day(),meal_type:'dinner',entry_type:'note',title:'Roasted vegetables',servings_override:2}})
  expect(createdLunch.status()).toBe(201)
  expect(createdDinner.status()).toBe(201)
  const lunchEntry = await createdLunch.json()
  const dinnerEntry = await createdDinner.json()
  try {
    await page.goto('/timeline')
    const sidebar = page.locator('.timeline-sidebar-wrapper')
    await expect(sidebar).toBeVisible()
    const firstCard = page.locator('.timeline-feed > .day-card').first()
    expect((await sidebar.boundingBox())!.y).toBeLessThan((await firstCard.boundingBox())!.y)
    await expect(sidebar.locator('[data-pc-name=accordionheader]').first()).toHaveAttribute('aria-expanded','false')
    const todaySlots = page.locator('.day-card.is-today .meal-slot')
    await expect(todaySlots).toHaveCount(3)
    const secondSlotBox = (await todaySlots.nth(1).boundingBox())!
    const thirdSlotBox = (await todaySlots.nth(2).boundingBox())!
    // Even with iOS Safari toolbars reducing the 844px iPhone 13 screen to ~660px, at least two meal slots (and even the third) must be visible without scrolling.
    expect(secondSlotBox.y + secondSlotBox.height).toBeLessThanOrEqual(600)
    expect(thirdSlotBox.y + thirdSlotBox.height).toBeLessThanOrEqual(660)
  } finally {
    await request.delete(`/api/timeline/${lunchEntry.id}?revision=${lunchEntry.revision}`)
    await request.delete(`/api/timeline/${dinnerEntry.id}?revision=${dinnerEntry.revision}`)
  }
})

test('user can define pre-defined notes like take-out and use them in recipe slots', async ({ page }) => {
  await login(page)
  await page.goto('/settings?section=household')
  const dinnerNotes = page.locator('[data-slot-notes="dinner"]')
  await expect(dinnerNotes).toBeVisible()
  const noteInput = page.getByLabel('New note for Dinner')
  await noteInput.fill('take-out')
  await page.getByRole('button', { name: 'Add note to Dinner', exact: true }).click()
  await expect(dinnerNotes).toContainText('take-out')
  await page.getByRole('button', { name: 'Save household', exact: true }).click()
  await expect(page.getByText('Household saved')).toBeVisible()

  await page.goto('/timeline')
  const slot = page.locator('.day-card.is-today .meal-slot[data-slot-id="dinner"]')
  const trigger = slot.getByRole('button', { name: 'Slot actions', exact: true })
  if (await trigger.isVisible()) {
    await trigger.click()
    await page.getByRole('menuitem', { name: 'Add another meal', exact: true }).click()
  } else {
    await slot.getByRole('button', { name: 'Add meal', exact: true }).click()
  }
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Note', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'take-out', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'take-out', exact: true }).click()
  await expect(dialog.getByLabel('Note title', { exact: true })).toHaveValue('take-out')
  await dialog.getByRole('button', { name: 'Add meal', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(slot).toContainText('take-out')
})

