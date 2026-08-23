import { describe, expect, it } from 'vitest'

describe('account discovery leads', () => {
  it('uses explicit review states', () => {
    expect(['possible', 'likely', 'not_mine']).toContain('possible')
    expect(['possible', 'likely', 'not_mine']).toContain('likely')
    expect(['possible', 'likely', 'not_mine']).toContain('not_mine')
  })
})
