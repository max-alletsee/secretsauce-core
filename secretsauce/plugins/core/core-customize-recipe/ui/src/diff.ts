export interface DiffSegment {
  type: 'same' | 'removed' | 'added'
  text: string
}

export interface IngredientDiff {
  added: any[]
  removed: any[]
  modified: any[]
  unchanged: any[]
}

export interface IngredientDiffRow {
  kind: 'unchanged' | 'modified' | 'substituted' | 'removed' | 'added'
  original?: any
  customized?: any
  qtyUnitChanged?: boolean
  notesChanged?: boolean
}

export function normalizeIngredientName(name: string): string {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

export function formatQtyUnit(
  item: any,
  scaleFactor = 1,
): string {
  if (!item) return ''
  const parts: string[] = []
  if (item.quantity != null && item.quantity !== '') {
    const val = Number(item.quantity) * scaleFactor
    const formatted = Number.isInteger(val) ? String(val) : Number(val.toFixed(1)).toString()
    if (item.quantity_max != null && item.quantity_max !== '') {
      const valMax = Number(item.quantity_max) * scaleFactor
      const formattedMax = Number.isInteger(valMax) ? String(valMax) : Number(valMax.toFixed(1)).toString()
      parts.push(`${formatted}-${formattedMax}`)
    } else {
      parts.push(formatted)
    }
  }
  if (item.unit) {
    parts.push(String(item.unit).trim())
  }
  return parts.join(' ')
}

export function formatFullIngredient(item: any, scaleFactor = 1): string {
  if (!item) return ''
  const qu = formatQtyUnit(item, scaleFactor)
  const name = (item.name || '').trim()
  const base = [qu, name].filter(Boolean).join(' ')
  const notes = (item.notes || '').trim()
  return notes ? `${base} (${notes})` : base
}

/**
 * Word-level inline diff between two strings.
 */
export function diffText(originalText?: string | null, newText?: string | null): DiffSegment[] {
  const orig = (originalText ?? '').trim()
  const next = (newText ?? '').trim()
  if (orig === next) {
    return next ? [{ type: 'same', text: next }] : []
  }
  if (!orig) {
    return [{ type: 'added', text: next }]
  }
  if (!next) {
    return [{ type: 'removed', text: orig }]
  }

  const origWords = orig.split(/\s+/)
  const nextWords = next.split(/\s+/)
  const m = origWords.length
  const n = nextWords.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (origWords[i] === nextWords[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1]
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const raw: { type: 'same' | 'removed' | 'added'; word: string }[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (origWords[i] === nextWords[j]) {
      raw.push({ type: 'same', word: origWords[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ type: 'removed', word: origWords[i] })
      i++
    } else {
      raw.push({ type: 'added', word: nextWords[j] })
      j++
    }
  }
  while (i < m) {
    raw.push({ type: 'removed', word: origWords[i++] })
  }
  while (j < n) {
    raw.push({ type: 'added', word: nextWords[j++] })
  }

  const merged: DiffSegment[] = []
  for (const token of raw) {
    const last = merged[merged.length - 1]
    if (last && last.type === token.type) {
      last.text += ` ${token.word}`
    } else {
      merged.push({ type: token.type, text: token.word })
    }
  }
  return merged
}

/**
 * Computes in-place ingredient rows supporting:
 * 1) unchanged: same ingredient with identical quantity/unit/notes
 * 2) modified: same ingredient name with changed quantity, unit, or notes
 * 3) substituted: 1-to-1 positional swap of one ingredient for another
 * 4) removed: purely removed ingredient (kept in-place as struck-through)
 * 5) added: purely added ingredient
 */
export function computeIngredientDiffRows(
  originalList: any[] = [],
  customizedList: any[] = [],
): IngredientDiffRow[] {
  const usedOrig = new Set<number>()
  const usedCust = new Set<number>()
  const custToOrigAnchor = new Map<number, number>()

  // First pass: anchor exact normalized ingredient name matches in order
  let lastOrigIdx = -1
  for (let cIdx = 0; cIdx < customizedList.length; cIdx++) {
    const cKey = normalizeIngredientName(customizedList[cIdx]?.name)
    if (!cKey) continue
    // Prefer monotonic match first, fallback to any unused match
    let matchedOIdx = -1
    for (let oIdx = lastOrigIdx + 1; oIdx < originalList.length; oIdx++) {
      if (!usedOrig.has(oIdx) && normalizeIngredientName(originalList[oIdx]?.name) === cKey) {
        matchedOIdx = oIdx
        break
      }
    }
    if (matchedOIdx === -1) {
      for (let oIdx = 0; oIdx < originalList.length; oIdx++) {
        if (!usedOrig.has(oIdx) && normalizeIngredientName(originalList[oIdx]?.name) === cKey) {
          matchedOIdx = oIdx
          break
        }
      }
    }
    if (matchedOIdx !== -1) {
      usedOrig.add(matchedOIdx)
      usedCust.add(cIdx)
      custToOrigAnchor.set(cIdx, matchedOIdx)
      if (matchedOIdx > lastOrigIdx) lastOrigIdx = matchedOIdx
    }
  }

  // Build ordered anchors where origIdx and custIdx are both increasing
  const anchors: { oIdx: number; cIdx: number }[] = []
  let prevO = -1
  for (let cIdx = 0; cIdx < customizedList.length; cIdx++) {
    const oIdx = custToOrigAnchor.get(cIdx)
    if (oIdx !== undefined && oIdx > prevO) {
      anchors.push({ oIdx, cIdx })
      prevO = oIdx
    }
  }

  const rows: IngredientDiffRow[] = []

  function classifySameIngredient(orig: any, cust: any): IngredientDiffRow {
    const qtyUnitChanged =
      Number(orig?.quantity ?? 0) !== Number(cust?.quantity ?? 0) ||
      Number(orig?.quantity_max ?? 0) !== Number(cust?.quantity_max ?? 0) ||
      (orig?.unit || '') !== (cust?.unit || '')
    const notesChanged = (orig?.notes || '').trim() !== (cust?.notes || '').trim()
    if (qtyUnitChanged || notesChanged) {
      return {
        kind: 'modified',
        original: orig,
        customized: cust,
        qtyUnitChanged,
        notesChanged,
      }
    }
    return {
      kind: 'unchanged',
      original: orig,
      customized: cust,
    }
  }

  // Check if the overall transformation dropped ingredients without adding new ones
  // vs substituted ingredients in gaps between anchors
  const totalUnmatchedOrig = originalList.length - anchors.length
  const totalUnmatchedCust = customizedList.length - anchors.length

  function emitGap(oStart: number, oEnd: number, cStart: number, cEnd: number) {
    const oGap: number[] = []
    for (let i = oStart; i < oEnd; i++) oGap.push(i)
    const cGap: number[] = []
    for (let j = cStart; j < cEnd; j++) cGap.push(j)

    const pairCount = Math.min(oGap.length, cGap.length)
    for (let k = 0; k < pairCount; k++) {
      const origItem = originalList[oGap[k]]
      const custItem = customizedList[cGap[k]]
      if (normalizeIngredientName(origItem?.name) === normalizeIngredientName(custItem?.name)) {
        rows.push(classifySameIngredient(origItem, custItem))
      } else {
        rows.push({
          kind: 'substituted',
          original: origItem,
          customized: custItem,
        })
      }
    }
    for (let k = pairCount; k < oGap.length; k++) {
      rows.push({
        kind: 'removed',
        original: originalList[oGap[k]],
      })
    }
    for (let k = pairCount; k < cGap.length; k++) {
      rows.push({
        kind: 'added',
        customized: customizedList[cGap[k]],
      })
    }
  }

  let curO = 0
  let curC = 0
  for (const anchor of anchors) {
    emitGap(curO, anchor.oIdx, curC, anchor.cIdx)
    rows.push(classifySameIngredient(originalList[anchor.oIdx], customizedList[anchor.cIdx]))
    curO = anchor.oIdx + 1
    curC = anchor.cIdx + 1
  }
  emitGap(curO, originalList.length, curC, customizedList.length)

  void totalUnmatchedOrig
  void totalUnmatchedCust
  return rows
}

export function computeIngredientDiff(
  originalList: any[] = [],
  adaptedList: any[] = [],
): IngredientDiff {
  const rows = computeIngredientDiffRows(originalList, adaptedList)
  const added: any[] = []
  const removed: any[] = []
  const modified: any[] = []
  const unchanged: any[] = []

  for (const row of rows) {
    if (row.kind === 'unchanged') {
      unchanged.push(row.customized)
    } else if (row.kind === 'modified') {
      modified.push(row.customized)
    } else if (row.kind === 'substituted') {
      removed.push(row.original)
      added.push(row.customized)
    } else if (row.kind === 'removed') {
      removed.push(row.original)
    } else if (row.kind === 'added') {
      added.push(row.customized)
    }
  }

  return { added, removed, modified, unchanged }
}
