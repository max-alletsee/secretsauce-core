export interface Ingredient {
  id?: string
  rawText: string
  name: string
  quantity: number | null
  quantityMax: number | null
  quantityText: string | null
  unit: string | null
  notes: string | null
}

const VULGAR_MAP: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875
}

const ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gramm: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml',
  l: 'l', liter: 'l', litre: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp', tl: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', el: 'tbsp',
  cup: 'cup', cups: 'cup', c: 'cup',
  clove: 'clove', cloves: 'clove', zehe: 'clove', zehen: 'clove',
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece', stück: 'piece', stk: 'piece'
}

export function canonical(alias: string, _lang = 'en'): string | null {
  const trimmed = alias.trim().replace(/\.$/, '')
  if (!trimmed) return null
  if (trimmed === 'T') return 'tbsp'
  if (trimmed === 't') return 'tsp'
  const lower = trimmed.toLowerCase()
  return ALIASES[lower] || null
}

function parseFraction(valStr: string): number | null {
  const s = valStr.trim()
  if (!s) return null
  for (const [vf, num] of Object.entries(VULGAR_MAP)) {
    if (s.includes(vf)) {
      const prefix = s.replace(vf, '').trim()
      const base = prefix ? parseFloat(prefix) : 0
      return base + num
    }
  }
  if (s.includes('/')) {
    const parts = s.split(/\s+/)
    if (parts.length === 2) {
      const [n, d] = parts[1].split('/').map(Number)
      return parseFloat(parts[0]) + n / d
    } else {
      const [n, d] = parts[0].split('/').map(Number)
      return n / d
    }
  }
  const parsed = parseFloat(s.replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

export function parse(text: string, lang = 'en'): Ingredient {
  const raw = text.trim()
  let notes: string | null = null
  let working = raw

  const parenMatch = working.match(/\(([^)]+)\)\s*$/)
  if (parenMatch) {
    notes = parenMatch[1].trim()
    working = working.slice(0, parenMatch.index).trim()
  }

  if (working.includes(',') && !working.match(/^\d+,\d+\s+[a-zA-Z]/)) {
    const [first, ...rest] = working.split(',')
    working = first.trim()
    const restText = rest.join(',').trim()
    notes = notes ? `${notes}, ${restText}` : restText
  }

  const rangeMatch = working.match(/^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+?)\s*(?:-|–|to|bis)\s*([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/i)
  if (rangeMatch) {
    const [, q1Str, q2Str, remainder] = rangeMatch
    const q1 = parseFraction(q1Str)
    const q2 = parseFraction(q2Str)
    if (q1 !== null && q2 !== null) {
      const words = remainder.split(/\s+/)
      const cUnit = words.length > 0 ? canonical(words[0], lang) : null
      return {
        rawText: raw,
        name: cUnit ? words.slice(1).join(' ') : remainder.trim(),
        quantity: q1,
        quantityMax: q2,
        quantityText: `${q1Str}-${q2Str}`.trim(),
        unit: cUnit,
        notes
      }
    }
  }

  const singleMatch = working.match(/^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/)
  if (singleMatch) {
    const [, qStr, remainder] = singleMatch
    const q = parseFraction(qStr)
    if (q !== null) {
      const words = remainder.split(/\s+/)
      const cUnit = words.length > 0 ? canonical(words[0], lang) : null
      return {
        rawText: raw,
        name: cUnit ? words.slice(1).join(' ') : remainder.trim(),
        quantity: q,
        quantityMax: null,
        quantityText: qStr.trim(),
        unit: cUnit,
        notes
      }
    }
  }

  return {
    rawText: raw,
    name: working,
    quantity: null,
    quantityMax: null,
    quantityText: null,
    unit: null,
    notes
  }
}

const FRACTION_DECIMALS: Array<[number, string]> = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'],
  [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']
]

export function format(
  quantity: number | null,
  quantityMax: number | null,
  unit: string | null,
  lang = 'en',
  system = 'metric'
): string {
  if (quantity === null) return ''

  function formatVal(val: number): string {
    if (system === 'us_customary') {
      const whole = Math.floor(val)
      const rem = val - whole
      for (const [frac, sym] of FRACTION_DECIMALS) {
        if (Math.abs(rem - frac) <= 0.04) {
          return whole ? `${whole} ${sym}` : sym
        }
      }
      if (Math.abs(rem) < 0.04) return `${whole}`
      if (Math.abs(rem - 1) < 0.04) return `${whole + 1}`
      return val.toFixed(1).replace(/\.0$/, '')
    } else {
      if (Number.isInteger(val)) return `${val}`
      const s = val.toFixed(2).replace(/\.?0+$/, '')
      return lang.startsWith('de') ? s.replace('.', ',') : s
    }
  }

  const qStr = formatVal(quantity)
  const full = quantityMax !== null ? `${qStr}-${formatVal(quantityMax)}` : qStr
  return unit ? `${full} ${unit}`.trim() : full
}
