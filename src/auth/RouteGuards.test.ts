import { describe, expect, it } from 'vitest'
import { getAuthRedirect } from './RouteGuards'

describe('authentication guards', () => {
  it('sends unauthenticated dashboard visits to login', () => expect(getAuthRedirect(false, '/dashboard/timeline')).toBe('/login'))
  it('sends authenticated users away from login and signup', () => {
    expect(getAuthRedirect(true, '/login')).toBe('/dashboard')
    expect(getAuthRedirect(true, '/signup')).toBe('/dashboard')
  })
  it('does not redirect a valid public visit', () => expect(getAuthRedirect(false, '/privacy')).toBeNull())
})
