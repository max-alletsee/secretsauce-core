export interface IngredientDiff {
  added: any[]
  removed: any[]
  modified: any[]
  unchanged: any[]
}

export function normalizeIngredientName(name: string): string {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

export function computeIngredientDiff(
  originalList: any[] = [],
  adaptedList: any[] = [],
): IngredientDiff {
  const origNormMap = new Map<string, any>()
  originalList.forEach(item => {
    origNormMap.set(normalizeIngredientName(item.name), item)
  })

  const adaptNormMap = new Map<string, any>()
  adaptedList.forEach(item => {
    adaptNormMap.set(normalizeIngredientName(item.name), item)
  })

  const added: any[] = []
  const removed: any[] = []
  const modified: any[] = []
  const unchanged: any[] = []

  for (const adapted of adaptedList) {
    const key = normalizeIngredientName(adapted.name)
    const original = origNormMap.get(key)
    if (!original) {
      added.push(adapted)
    } else {
      const changed =
        original.quantity !== adapted.quantity ||
        original.unit !== adapted.unit ||
        (original.notes || '') !== (adapted.notes || '')
      if (changed) {
        modified.push(adapted)
      } else {
        unchanged.push(adapted)
      }
    }
  }

  for (const original of originalList) {
    const key = normalizeIngredientName(original.name)
    if (!adaptNormMap.has(key)) {
      removed.push(original)
    }
  }

  return { added, removed, modified, unchanged }
}
