import { ref, type Ref } from 'vue'
import type { SecretSauceUI } from '@secretsauce/ui'

export interface RecurringRule {
  id: string
  weekday: number
  meal_type: string
  entry_type: 'recipe' | 'note'
  recipe_id?: string | null
  recipe_title?: string | null
  title?: string | null
  servings: number
  created_at?: string
  updated_at?: string
}

export interface RecurringSuggestion {
  rule_id: string
  date: string
  weekday: number
  meal_type: string
  entry_type: 'recipe' | 'note'
  recipe_id?: string | null
  recipe_title?: string | null
  title?: string | null
  servings: number
}

interface RecurringState {
  suggestions: Ref<RecurringSuggestion[]>
  registerDate: (date: string) => () => void
  refreshSuggestions: () => Promise<void>
  removeSuggestion: (ruleId: string, date: string) => void
}

const stateByApi = new WeakMap<object, RecurringState>()

function shiftDate(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function useRecurringState(ss: SecretSauceUI): RecurringState {
  const key = (ss.api as unknown as object) || (ss as unknown as object)
  const existing = stateByApi.get(key)
  if (existing) return existing

  const suggestions = ref<RecurringSuggestion[]>([])
  const dateCounts = new Map<string, number>()
  let scheduled = false
  let fetchRevision = 0

  async function fetchRange() {
    scheduled = false
    const dates = Array.from(dateCounts.keys()).sort()
    if (!dates.length) {
      suggestions.value = []
      return
    }
    const from = dates[0]
    const to = dates[dates.length - 1]
    const rev = ++fetchRevision
    try {
      const collected: RecurringSuggestion[] = []
      for (let start = from; start <= to; ) {
        const end = shiftDate(start, 90) < to ? shiftDate(start, 90) : to
        const res = await ss.api.get<RecurringSuggestion[]>('/api/x/core-recurring/suggestions', {
          from: start,
          to: end,
        })
        if (rev !== fetchRevision) return
        if (Array.isArray(res)) collected.push(...res)
        start = shiftDate(end, 1)
      }
      if (rev === fetchRevision) {
        suggestions.value = collected
      }
    } catch {
      // Keep existing or empty suggestions on transient read failure
    }
  }

  function scheduleFetch() {
    if (scheduled) return
    scheduled = true
    queueMicrotask(fetchRange)
  }

  function registerDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return () => {}
    dateCounts.set(date, (dateCounts.get(date) || 0) + 1)
    scheduleFetch()
    return () => {
      const next = (dateCounts.get(date) || 1) - 1
      if (next <= 0) dateCounts.delete(date)
      else dateCounts.set(date, next)
    }
  }

  function removeSuggestion(ruleId: string, date: string) {
    suggestions.value = suggestions.value.filter(
      (s) => !(s.rule_id === ruleId && s.date === date)
    )
  }

  ss.on('core-recurring:changed', () => scheduleFetch())
  ss.on('core-timeline:slots-changed', () => scheduleFetch())

  const state: RecurringState = {
    suggestions,
    registerDate,
    refreshSuggestions: fetchRange,
    removeSuggestion,
  }
  stateByApi.set(key, state)
  return state
}

export function defaultHouseholdServings(ss: SecretSauceUI): number {
  const members = ss.store.members?.value || []
  if (!members.length) return 2
  const sum = members.reduce((acc: number, m: any) => acc + (Number(m?.serving_ratio) || 1), 0)
  return sum > 0 ? Math.round(sum * 100) / 100 : 2
}
