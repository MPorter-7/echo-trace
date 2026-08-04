import { describe, expect, it } from 'vitest'
import { guidedSearchConnectors, normalizePublicSourceUrl, validatePublicArchiveUrl } from './sourceConnectors'

describe('guided source connectors', () => {
  it('generates outbound searches without fetching private identifiers', () => {
    const identifier = { value: 'old_handle' } as Parameters<(typeof guidedSearchConnectors)[0]['buildUrl']>[0]
    expect(guidedSearchConnectors[0].buildUrl(identifier)).toContain('google.com/search')
  })
  it('allows only HTTP archive URLs', () => {
    expect(validatePublicArchiveUrl('https://archive.example/item')).toBe('https://archive.example/item')
    expect(validatePublicArchiveUrl('javascript:alert(1)')).toBeNull()
  })
  it('normalizes only case-insensitive URL components', () => {
    expect(normalizePublicSourceUrl('HTTPS://EXAMPLE.COM/Record?Token=AbC#section')).toBe('https://example.com/Record?Token=AbC')
    expect(normalizePublicSourceUrl('https://example.com/record?Token=AbC')).not.toBe(normalizePublicSourceUrl('https://example.com/Record?Token=AbC'))
  })
})
