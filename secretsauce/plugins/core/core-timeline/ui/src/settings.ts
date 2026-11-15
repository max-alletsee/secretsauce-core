import type { SecretSauceUI } from '@secretsauce/ui'
import { shiftDate, type DateWindow } from './days'

export const DEFAULT_PAST_DAYS = 2
export const MIN_PAST_DAYS = 0
export const MAX_PAST_DAYS = 30
export const DEFAULT_PLANNING_DAYS = 7
export const MIN_PLANNING_DAYS = 1
export const MAX_PLANNING_DAYS = 60

export interface TimelineSettings {
  default_past_days: number
  default_planning_days: number
}

export function defaultTimelineSettings(): TimelineSettings {
  return {
    default_past_days: DEFAULT_PAST_DAYS,
    default_planning_days: DEFAULT_PLANNING_DAYS,
  }
}

function normalizeInt(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return fallback
  return Math.max(min, Math.min(max, raw))
}

export function normalizeTimelineSettings(raw: unknown): TimelineSettings {
  const defaults = defaultTimelineSettings()
  if (!raw || typeof raw !== 'object') return defaults
  const obj = raw as Record<string, unknown>
  return {
    default_past_days: normalizeInt(obj.default_past_days, defaults.default_past_days, MIN_PAST_DAYS, MAX_PAST_DAYS),
    default_planning_days: normalizeInt(
      obj.default_planning_days,
      defaults.default_planning_days,
      MIN_PLANNING_DAYS,
      MAX_PLANNING_DAYS,
    ),
  }
}

export function windowForSettings(today: string, settings: TimelineSettings): DateWindow {
  return {
    from: shiftDate(today, -settings.default_past_days),
    to: shiftDate(today, settings.default_planning_days - 1),
  }
}

export async function fetchTimelineSettings(ss: SecretSauceUI): Promise<TimelineSettings> {
  try {
    const res = await ss.api.get<unknown>('/api/x/core-timeline/settings')
    return normalizeTimelineSettings(res)
  } catch {
    return defaultTimelineSettings()
  }
}
