import { describe, expect, it } from 'vitest'
import { findStartingEmail, hasVerifiedAccountEmail, normalizeAccountEmail, reconstructionProgress } from './reconstruction'
import type { Identifier } from '../types/echo'

const identifier = (overrides: Partial<Identifier>): Identifier => ({
  id: 'identifier-id',
  user_id: 'user-id',
  type: 'email',
  value: 'verified@example.com',
  label: 'Verified account email',
  verification_status: 'verified_account',
  verification_method: 'Verified by Supabase Auth',
  notes: null,
  created_at: '2026-08-04T00:00:00.000Z',
  updated_at: '2026-08-04T00:00:00.000Z',
  ...overrides,
})

describe('email-first reconstruction', () => {
  it('normalizes the authenticated email used as the first clue', () => {
    expect(normalizeAccountEmail('  Person@Example.COM ')).toBe('person@example.com')
  })

  it('prefers the verified identifier stored by the signup trigger', () => {
    expect(findStartingEmail([
      identifier({ value: 'old@example.com', verification_status: 'unverified_historical' }),
      identifier({ id: 'verified', value: 'current@example.com' }),
    ], 'current@example.com')).toBe('current@example.com')
  })

  it('requires the verified record to match the current authenticated email', () => {
    const identifiers = [identifier({ value: 'former@example.com' })]
    expect(hasVerifiedAccountEmail(identifiers, 'current@example.com')).toBe(false)
    expect(findStartingEmail(identifiers, 'current@example.com')).toBe('current@example.com')
  })

  it('counts reconstruction evidence without requiring a manual memory', () => {
    expect(reconstructionProgress({ identifiers: 1, archiveFiles: 0, matches: 0, emailImports: 0, emailFindings: 0 }, true)).toBe(25)
    expect(reconstructionProgress({ identifiers: 1, archiveFiles: 0, matches: 0, emailImports: 1, emailFindings: 2 }, true)).toBe(75)
    expect(reconstructionProgress({ identifiers: 2, archiveFiles: 1, matches: 1, emailImports: 0, emailFindings: 0 }, true)).toBe(100)
  })
})
