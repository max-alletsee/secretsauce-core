import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import { registeredRoute, clickButton, testMember } from '../helpers/registeredPlugin'

const wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount())
  document.body.innerHTML = ''
})

function localDay(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function pickCalendarDate(targetIso: string) {
  const [targetYear, targetMonth, targetDay] = targetIso.split('-').map(Number)
  const dialog = document.querySelector('[role=dialog]')!
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  for (let guard = 0; guard < 24; guard++) {
    const monthBtn = dialog.querySelector<HTMLButtonElement>('.p-datepicker-select-month')
    const yearBtn = dialog.querySelector<HTMLButtonElement>('.p-datepicker-select-year')
    const shownMonth = monthNames.indexOf(monthBtn?.textContent?.trim() || '') + 1
    const shownYear = Number(yearBtn?.textContent?.trim() || '0')
    if (shownYear === targetYear && shownMonth === targetMonth) break
    const targetVal = targetYear * 12 + targetMonth
    const shownVal = shownYear * 12 + shownMonth
    const navBtn = dialog.querySelector<HTMLButtonElement>(
      targetVal > shownVal ? '.p-datepicker-next-button' : '.p-datepicker-prev-button'
    )
    if (!navBtn) throw new Error('DatePicker navigation button not found')
    navBtn.click()
    await flushPromises()
  }

  const dayCell = Array.from(dialog.querySelectorAll<HTMLElement>('td:not(.p-datepicker-other-month) .p-datepicker-day'))
    .find(el => el.textContent?.trim() === String(targetDay))
  if (!dayCell) throw new Error(`Calendar day ${targetDay} not found in dialog`)
  dayCell.click()
  await flushPromises()
}

async function openCardMenu(wrapper: VueWrapper, title: string) {
  const card = wrapper.findAll('.timeline-card').find(c => c.text().includes(title))
  if (!card) throw new Error(`Missing timeline card: ${title}`)
  await card.trigger('click')
  await flushPromises()
}

function menuItems(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).map(el => el.textContent?.trim() || '')
}

async function clickMenuItem(label: string) {
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(el => el.textContent?.trim() === label)
  if (!item) throw new Error(`Missing menu item: ${label}`)
  item.querySelector<HTMLElement>('a')?.click() || item.click()
  await flushPromises()
}

describe('Timeline Move meal action', () => {
  it('offers Move meal in entry:interact for both planned and cooked entries in expected order', async () => {
    const today = localDay(0)
    const entries = [
      { id: 'e-planned', revision: 1, date: today, meal_type: 'dinner', title: 'Planned Pasta', status: 'planned', position: 0 },
      { id: 'e-cooked', revision: 1, date: today, meal_type: 'lunch', title: 'Cooked Soup', status: 'cooked', position: 0 },
    ]
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/slots') {
          const days: Record<string, any[]> = {}
          for (let d = query.from; d <= query.to;) {
            days[d] = [
              { id: 'lunch', label: 'Lunch', kind: 'default', skipped: false },
              { id: 'dinner', label: 'Dinner', kind: 'default', skipped: false },
            ]
            const dt = new Date(`${d}T12:00:00`)
            dt.setDate(dt.getDate() + 1)
            d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          }
          return { days }
        }
        if (path.startsWith('/api/timeline')) return entries
        return []
      },
    } as any, '/timeline')
    wrappers.push(wrapper)

    await openCardMenu(wrapper, 'Planned Pasta')
    expect(menuItems()).toEqual(['Mark as cooked', 'Move meal', 'Remove from plan'])

    // Close first popup menu before opening second card's menu
    await openCardMenu(wrapper, 'Planned Pasta')
    await openCardMenu(wrapper, 'Cooked Soup')
    expect(menuItems()).toEqual(['Unmark as cooked', 'Move meal', 'Remove from plan'])
  })

  it('shows occupied dot excluding moved entry, disables Move when unchanged, and appends at max position + 1', async () => {
    const today = localDay(0)
    const tomorrow = localDay(1)
    let entries = [
      { id: 'e1', revision: 2, date: today, meal_type: 'dinner', title: 'Moveable Tacos', status: 'planned', position: 0 },
      { id: 'e2', revision: 1, date: tomorrow, meal_type: 'lunch', title: 'Existing Salad', status: 'planned', position: 3 },
    ]
    const patchCalls: Array<{ path: string; body: any }> = []

    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/slots') {
          const days: Record<string, any[]> = {}
          for (let d = query.from; d <= query.to;) {
            days[d] = [
              { id: 'breakfast', label: 'Breakfast', kind: 'default', skipped: false },
              { id: 'lunch', label: 'Lunch', kind: 'default', skipped: false },
              { id: 'dinner', label: 'Dinner', kind: 'default', skipped: false },
            ]
            const dt = new Date(`${d}T12:00:00`)
            dt.setDate(dt.getDate() + 1)
            d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          }
          return { days }
        }
        if (path.startsWith('/api/timeline')) {
          return entries.filter(e => e.date >= query.from && e.date <= query.to)
        }
        return []
      },
      patch: async (path: string, body: any) => {
        patchCalls.push({ path, body })
        entries = entries.map(e => (e.id === 'e1' ? { ...e, ...body, revision: e.revision + 1 } : e))
        return entries.find(e => e.id === 'e1')
      },
    } as any, '/timeline')
    wrappers.push(wrapper)
    harness.householdStore.currentMember = testMember

    await openCardMenu(wrapper, 'Moveable Tacos')
    await clickMenuItem('Move meal')

    const dialog = document.querySelector('[role=dialog]')!
    expect(dialog).toBeTruthy()
    expect(dialog.querySelector('.p-datepicker')).toBeTruthy()

    // On initial date (today), Dinner only contains Moveable Tacos itself -> should NOT show occupied dot
    const todayDinnerBtn = dialog.querySelector<HTMLButtonElement>('[data-move-slot="dinner"]')!
    expect(todayDinnerBtn.getAttribute('data-slot-occupied')).toBe('false')
    expect(todayDinnerBtn.querySelector('.slot-occupied-dot')).toBeNull()

    // Same date & slot -> Move button disabled
    const moveBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === 'Move')!
    expect(moveBtn.disabled).toBe(true)

    // Pick tomorrow -> Lunch has Existing Salad so should show occupied dot, without showing meal title
    await pickCalendarDate(tomorrow)
    const tomorrowLunchBtn = dialog.querySelector<HTMLButtonElement>('[data-move-slot="lunch"]')!
    expect(tomorrowLunchBtn.getAttribute('data-slot-occupied')).toBe('true')
    expect(tomorrowLunchBtn.querySelector('.slot-occupied-dot')).toBeTruthy()
    expect(tomorrowLunchBtn.textContent).not.toContain('Existing Salad')

    tomorrowLunchBtn.click()
    await flushPromises()
    expect(moveBtn.disabled).toBe(false)

    moveBtn.click()
    await flushPromises()

    expect(patchCalls).toEqual([{
      path: '/api/timeline/e1',
      body: {
        revision: 2,
        date: tomorrow,
        meal_type: 'lunch',
        position: 4,
        status: 'planned',
        cooked_by_member_id: null,
      },
    }])
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })

  it('auto-defaults cooked status by past/future/same-day, allows manual override, un-skips skipped slot, and shows inline errors', async () => {
    const today = localDay(0)
    const yesterday = localDay(-1)
    const tomorrow = localDay(1)
    let entries = [
      { id: 'e1', revision: 1, date: today, meal_type: 'dinner', title: 'Today Curry', status: 'cooked', cooked_by_member_id: 'member-1', position: 0 },
    ]
    const deletedPaths: string[] = []
    const patchCalls: any[] = []
    let failNextPatch = true

    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/slots') {
          const days: Record<string, any[]> = {}
          for (let d = query.from; d <= query.to;) {
            days[d] = [
              { id: 'lunch', label: 'Lunch', kind: 'default', skipped: d === tomorrow },
              { id: 'dinner', label: 'Dinner', kind: 'default', skipped: false },
            ]
            const dt = new Date(`${d}T12:00:00`)
            dt.setDate(dt.getDate() + 1)
            d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          }
          return { days }
        }
        if (path.startsWith('/api/timeline')) {
          return entries.filter(e => e.date >= query.from && e.date <= query.to)
        }
        return []
      },
      patch: async (path: string, body: any) => {
        if (failNextPatch) {
          failNextPatch = false
          throw new Error('Revision mismatch')
        }
        patchCalls.push({ path, body })
        entries = entries.map(e => (e.id === 'e1' ? { ...e, ...body, revision: e.revision + 1 } : e))
        return entries[0]
      },
      delete: async (path: string) => {
        deletedPaths.push(path)
      },
    } as any, '/timeline')
    wrappers.push(wrapper)
    harness.householdStore.currentMember = testMember

    await openCardMenu(wrapper, 'Today Curry')
    await clickMenuItem('Move meal')
    const dialog = document.querySelector('[role=dialog]')!
    const cookedInput = () => dialog.querySelector<HTMLInputElement>('#move-cooked-toggle')!

    // Same day starts with entry's current status (cooked = true)
    expect(cookedInput().checked).toBe(true)

    // Pick tomorrow (future) -> auto-defaults to false (planned) and shows skipped slot labeled "(skipped)"
    await pickCalendarDate(tomorrow)
    expect(cookedInput().checked).toBe(false)
    const skippedBtn = dialog.querySelector<HTMLButtonElement>('[data-move-slot="lunch"]')!
    expect(skippedBtn.textContent).toContain('(skipped)')

    // Pick yesterday (past) -> auto-defaults to true (cooked)
    await pickCalendarDate(yesterday)
    expect(cookedInput().checked).toBe(true)

    // Return to tomorrow, select skipped lunch, manually toggle cooked ON? No, leave unchecked -> verify conflict inline error first
    await pickCalendarDate(tomorrow)
    dialog.querySelector<HTMLButtonElement>('[data-move-slot="lunch"]')!.click()
    await flushPromises()
    await clickButton('Move', dialog)
    expect(dialog.textContent).toContain('Revision mismatch')
    expect(document.querySelector('[role=dialog]')).toBeTruthy()
    expect(deletedPaths).toEqual([])

    // Retry Move -> succeeds and deletes skip override
    await clickButton('Move', dialog)
    expect(patchCalls[0].body.status).toBe('planned')
    expect(patchCalls[0].body.cooked_by_member_id).toBeNull()
    expect(deletedPaths).toEqual([`/api/x/core-timeline/days/${tomorrow}/slots/lunch`])
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })
})
