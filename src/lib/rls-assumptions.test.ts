import { describe, expect, it } from 'vitest'

const ownerPolicy = (authenticatedUserId: string | null, rowUserId: string) => authenticatedUserId !== null && authenticatedUserId === rowUserId

describe('RLS ownership assumptions', () => {
  it('allows the owner and rejects another authenticated user', () => {
    expect(ownerPolicy('user-a', 'user-a')).toBe(true)
    expect(ownerPolicy('user-b', 'user-a')).toBe(false)
  })
  it('rejects anonymous access', () => expect(ownerPolicy(null, 'user-a')).toBe(false))
})
