import { describe, expect, it } from 'vitest'
import { shouldHideAgent } from './agentVisibility'

describe('agent visibility', () => {
  it('hides the agent on sign-in and billing screens', () => {
    for (const path of ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/billing/complete']) expect(shouldHideAgent(path)).toBe(true)
  })
  it('ignores a trailing slash', () => expect(shouldHideAgent('/login/')).toBe(true))
  it('keeps the agent on public pages and the dashboard', () => {
    for (const path of ['/', '/privacy', '/terms', '/refunds', '/dashboard', '/dashboard/settings']) expect(shouldHideAgent(path)).toBe(false)
  })
})
