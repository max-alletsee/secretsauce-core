export const DEFAULT_PREDEFINED_NOTES = ['Dining out', 'Leftovers', 'Takeout', 'Quick meal']

/** Stable, bounded ASCII ids; renames never call this helper. */
export function slugMealType(label: string, existingIds: string[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'slot'
  const ids = new Set(existingIds)
  let candidate = base.slice(0, 64).replace(/-+$/g, '')
  for (let n = 2; ids.has(candidate); n++) {
    const suffix = `-${n}`
    candidate = base.slice(0, 64 - suffix.length).replace(/-+$/g, '') + suffix
  }
  return candidate
}
