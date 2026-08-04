import { describe, expect, it } from 'vitest'
import { calculateConfidence, canTransitionMatch, confidenceLevel } from './confidence'

describe('deterministic confidence scoring', () => {
  it('caps a strong score at 100 and explains its signals', () => {
    const result = calculateConfidence({ exactUsername: true, matchingKnownUrl: true, matchingDisplayName: true, matchingDateRange: true, matchingPlatform: true })
    expect(result.score).toBe(100)
    expect(result.level).toBe('high')
    expect(result.matchingSignals).toContain('Exact username match')
  })
  it('subtracts conflicting evidence', () => expect(calculateConfidence({ exactUsername: true, conflictingDisplayName: true, conflictingDate: true }).score).toBe(0))
  it('uses documented score bands', () => {
    expect(confidenceLevel(80)).toBe('high')
    expect(confidenceLevel(50)).toBe('medium')
    expect(confidenceLevel(49)).toBe('low')
  })
})

describe('match status transitions', () => {
  it('allows user review changes but not no-op transitions', () => {
    expect(canTransitionMatch('pending', 'accepted')).toBe(true)
    expect(canTransitionMatch('accepted', 'accepted')).toBe(false)
    expect(canTransitionMatch('pending', 'invalid')).toBe(false)
  })
})
