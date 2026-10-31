export type DateWindow = { from: string; to: string }
export type ResolvedSlot = { id: string; label: string; kind: 'default' | 'extra'; skipped: boolean }
export type ScheduleEntry = { id: string; revision: number; date: string; meal_type: string; recipe_id?: string | null; title?: string | null; [key: string]: any }
export type SlotVM = ResolvedSlot & { entries: ScheduleEntry[]; synthetic?: boolean }
export type DayVM = { date: string; isPast: boolean; isToday: boolean; slots: SlotVM[] }
export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function buildDays(window: DateWindow, resolvedSlots: Record<string, ResolvedSlot[]>, entries: ScheduleEntry[], today: string): DayVM[] {
  const days: DayVM[] = []
  for (let date = window.from; date <= window.to; date = shiftDate(date, 1)) {
    const slots: SlotVM[] = (resolvedSlots[date] || []).map(slot => ({ ...slot, entries: [] }))
    for (const entry of entries.filter(entry => entry.date === date)) {
      const alias = entry.meal_type.toLowerCase()
      let slot = slots.find(slot => slot.id.toLowerCase() === alias) || slots.find(slot => slot.label.toLowerCase() === alias)
      if (!slot) { slot = { id: entry.meal_type, label: entry.meal_type.replace(/[-_]/g,' ').replace(/\b\w/g, char => char.toUpperCase()), kind: 'extra', skipped: false, entries: [], synthetic: true }; slots.push(slot) }
      slot.entries.push(entry); slot.skipped = false
    }
    days.push({date, isPast: date < today, isToday: date === today, slots})
  }
  return days
}
