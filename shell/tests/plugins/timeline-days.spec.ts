import { describe, it, expect } from 'vitest'
import { buildDays, shiftDate } from '../../../secretsauce/plugins/core/core-timeline/ui/src/days'
const defaults = [{ id: 'breakfast', label: 'Breakfast', kind: 'default' as const, skipped: false }, { id: 'lunch', label: 'Lunch', kind: 'default' as const, skipped: true }, { id: 'dinner', label: 'Evening meal', kind: 'default' as const, skipped: false }]
describe('local-calendar Timeline composition', () => {
  it.each([['2026-01-31',1,'2026-02-01'],['2026-03-01',-1,'2026-02-28'],['2028-02-28',1,'2028-02-29'],['2026-12-31',1,'2027-01-01']])('shifts %s by %i as %s', (date, n, want) => expect(shiftDate(date, n)).toBe(want))
  it('build_days_never_hides_legacy_or_unmatched_meals', () => {
    const entries = [
      { id:'a',revision:1,date:'2026-09-28',meal_type:'Dinner' },
      { id:'b',revision:1,date:'2026-09-28',meal_type:'evening meal' },
      { id:'c',revision:1,date:'2026-09-28',meal_type:'late-snack' },
      { id:'d',revision:1,date:'2026-09-28',meal_type:'Lunch' },
    ]
    const days = buildDays({from:'2026-09-27',to:'2026-09-29'}, {'2026-09-28':defaults}, entries, '2026-09-28')
    expect(days.map(day => [day.date,day.isPast,day.isToday])).toEqual([['2026-09-27',true,false],['2026-09-28',false,true],['2026-09-29',false,false]])
    expect(days[1].slots.map(slot => slot.id)).toEqual(['breakfast','lunch','dinner','late-snack'])
    expect(days[1].slots[2].entries.map(entry => entry.id)).toEqual(['a','b'])
    expect(days[1].slots[1].skipped).toBe(false)
    expect(days[1].slots[3]).toMatchObject({label:'Late Snack',kind:'extra',entries:[entries[2]]})
    expect(defaults[1].skipped).toBe(true)
  })
  it('preserves resolved extra order and empty skipped slots', () => {
    const slots = [defaults[0],{id:'brunch',label:'Brunch',kind:'extra' as const,skipped:false},...defaults.slice(1)]
    const [day] = buildDays({from:'2026-09-28',to:'2026-09-28'}, {'2026-09-28':slots}, [], '2026-09-28')
    expect(day.slots.map(slot => slot.id)).toEqual(['breakfast','brunch','lunch','dinner'])
    expect(day.slots[2].skipped).toBe(true)
  })
})
