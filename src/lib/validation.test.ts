import { describe, expect, it } from 'vitest'
import { validateDisplayName, validateIdentifier, validateTimelineEvent } from './validation'

describe('display name validation', () => {
  it('enforces the database limit before signup', () => {
    expect(validateDisplayName('A'.repeat(120)).valid).toBe(true)
    expect(validateDisplayName('A'.repeat(121)).valid).toBe(false)
  })
})

describe('identifier validation', () => {
  it('normalizes email identifiers', () => expect(validateIdentifier('email', '  Me@Example.COM ')).toMatchObject({ valid: true, normalized: 'me@example.com' }))
  it('rejects invalid historical emails', () => expect(validateIdentifier('email', 'not-an-email').valid).toBe(false))
  it('accepts only public HTTP URL schemes', () => {
    expect(validateIdentifier('profile_url', 'https://example.com/me').valid).toBe(true)
    expect(validateIdentifier('profile_url', 'javascript:alert(1)').valid).toBe(false)
  })
})

describe('timeline validation', () => {
  it('requires titles and exact dates when selected', () => {
    expect(validateTimelineEvent({ title: '', datePrecision: 'unknown' }).valid).toBe(false)
    expect(validateTimelineEvent({ title: 'First post', datePrecision: 'exact' }).valid).toBe(false)
  })
  it('supports approximate years', () => expect(validateTimelineEvent({ title: 'Old account', datePrecision: 'year', approximateYear: '2008' }).valid).toBe(true))
  it('requires a month for month-and-year precision', () => {
    expect(validateTimelineEvent({ title: 'Old account', datePrecision: 'month', approximateYear: '2008' }).valid).toBe(false)
    expect(validateTimelineEvent({ title: 'Old account', datePrecision: 'month', approximateYear: '2008', approximateMonth: '6' }).valid).toBe(true)
  })
})
