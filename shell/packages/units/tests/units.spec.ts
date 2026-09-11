import { describe, it, expect } from 'vitest'
import { parse, format } from '../src/index'

describe('@secretsauce/units browser package', () => {
  it('parses vulgar fractions and units', () => {
    const res = parse('½ cup sugar', 'en')
    expect(res.quantity).toBe(0.5)
    expect(res.unit).toBe('cup')
    expect(res.name).toBe('sugar')
  })

  it('parses ranges and notes', () => {
    const res = parse('2-3 cloves garlic (minced)', 'en')
    expect(res.quantity).toBe(2)
    expect(res.quantityMax).toBe(3)
    expect(res.unit).toBe('clove')
    expect(res.name).toBe('garlic')
    expect(res.notes).toBe('minced')
  })

  it('formats vulgar fractions in US customary', () => {
    expect(format(0.5, null, 'cup', 'en', 'us_customary')).toBe('½ cup')
    expect(format(1.5, null, 'tbsp', 'en', 'us_customary')).toBe('1 ½ tbsp')
  })
})
