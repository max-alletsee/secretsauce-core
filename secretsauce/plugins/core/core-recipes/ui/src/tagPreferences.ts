export const RECIPE_TAG_PREFS_KEY = 'secretsauce:recipe_tag_prefs'
export const DEFAULT_VISIBLE_TAG_COUNT = 8

export interface TagSummary {
  name: string
  count: number
}

export interface RecipeTagPrefs {
  showAll: boolean
  visibleCount: number
  pinnedTags: string[]
}

export function defaultTagPrefs(): RecipeTagPrefs {
  return {
    showAll: false,
    visibleCount: DEFAULT_VISIBLE_TAG_COUNT,
    pinnedTags: [],
  }
}

function normalizePrefs(raw: unknown): RecipeTagPrefs {
  const defaults = defaultTagPrefs()
  if (!raw || typeof raw !== 'object') return defaults
  const obj = raw as Record<string, unknown>

  const showAll = typeof obj.showAll === 'boolean' ? obj.showAll : defaults.showAll

  let visibleCount = defaults.visibleCount
  if (typeof obj.visibleCount === 'number' && Number.isInteger(obj.visibleCount) && obj.visibleCount >= 0) {
    visibleCount = obj.visibleCount
  }

  const seen = new Set<string>()
  const pinnedTags: string[] = []
  if (Array.isArray(obj.pinnedTags)) {
    for (const entry of obj.pinnedTags) {
      if (typeof entry === 'string' && entry.trim() && !seen.has(entry)) {
        seen.add(entry)
        pinnedTags.push(entry)
      }
    }
  }

  return { showAll, visibleCount, pinnedTags }
}

export function readTagPrefs(): RecipeTagPrefs {
  try {
    const raw = localStorage.getItem(RECIPE_TAG_PREFS_KEY)
    if (!raw) return defaultTagPrefs()
    return normalizePrefs(JSON.parse(raw))
  } catch {
    return defaultTagPrefs()
  }
}

export function writeTagPrefs(prefs: RecipeTagPrefs): RecipeTagPrefs {
  const normalized = normalizePrefs(prefs)
  try {
    localStorage.setItem(RECIPE_TAG_PREFS_KEY, JSON.stringify(normalized))
  } catch {
    // Device storage is optional.
  }
  return normalized
}

export function syncRenamedPinnedTag(fromName: string, toName: string): RecipeTagPrefs {
  const prefs = readTagPrefs()
  if (!prefs.pinnedTags.includes(fromName)) return prefs
  const seen = new Set<string>()
  const next: string[] = []
  for (const tag of prefs.pinnedTags) {
    const mapped = tag === fromName ? toName : tag
    if (mapped.trim() && !seen.has(mapped)) {
      seen.add(mapped)
      next.push(mapped)
    }
  }
  return writeTagPrefs({ ...prefs, pinnedTags: next })
}

export function syncDeletedPinnedTag(name: string): RecipeTagPrefs {
  const prefs = readTagPrefs()
  if (!prefs.pinnedTags.includes(name)) return prefs
  return writeTagPrefs({
    ...prefs,
    pinnedTags: prefs.pinnedTags.filter(tag => tag !== name),
  })
}

export function orderTags(tags: TagSummary[], pinnedTags: string[]): TagSummary[] {
  const active = tags.filter(t => t.count > 0 && t.name.trim() !== '')
  const byName = new Map(active.map(t => [t.name, t]))

  const pinnedSet = new Set<string>()
  const pinnedList: TagSummary[] = []
  for (const name of pinnedTags) {
    const match = byName.get(name)
    if (match && !pinnedSet.has(name)) {
      pinnedSet.add(name)
      pinnedList.push(match)
    }
  }

  const unpinnedList = active
    .filter(t => !pinnedSet.has(t.name))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })

  return [...pinnedList, ...unpinnedList]
}

export function partitionVisibleTags(
  tags: TagSummary[],
  prefs: RecipeTagPrefs,
  expanded: boolean,
  activeTag: string | null,
): {
  visible: TagSummary[]
  hiddenCount: number
  showToggle: boolean
} {
  const ordered = orderTags(tags, prefs.pinnedTags)
  if (prefs.showAll) {
    return { visible: ordered, hiddenCount: 0, showToggle: false }
  }

  const pinnedSet = new Set(prefs.pinnedTags)
  const pinned = ordered.filter(t => pinnedSet.has(t.name))
  const unpinned = ordered.filter(t => !pinnedSet.has(t.name))
  const topUnpinned = unpinned.slice(0, prefs.visibleCount)
  const baseVisible = [...pinned, ...topUnpinned]
  const baseNames = new Set(baseVisible.map(t => t.name))

  const activeExtra = activeTag && !baseNames.has(activeTag)
    ? ordered.find(t => t.name === activeTag) ?? null
    : null

  const collapsedVisible = activeExtra ? [...baseVisible, activeExtra] : baseVisible
  const hiddenCount = Math.max(0, ordered.length - collapsedVisible.length)

  if (expanded) {
    return {
      visible: ordered,
      hiddenCount: 0,
      showToggle: unpinned.length > prefs.visibleCount,
    }
  }

  return {
    visible: collapsedVisible,
    hiddenCount,
    showToggle: hiddenCount > 0,
  }
}
