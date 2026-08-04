import { describe, expect, it } from 'vitest'
import { rowsToCsv } from './export'

describe('CSV export formatting', () => {
  it('quotes commas, quotes, arrays, and null values', () => {
    const csv = rowsToCsv([{ title: 'Hello, world', note: 'A "quote"', tags: ['old', 'web'], counts: { receipt: 2 }, empty: null }])
    expect(csv).toContain('"Hello, world"')
    expect(csv).toContain('"A ""quote"""')
    expect(csv).toContain('"old|web"')
    expect(csv).toContain('"{""receipt"":2}"')
    expect(csv).toContain('""')
  })
})
