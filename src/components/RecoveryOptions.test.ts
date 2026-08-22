import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./RecoveryOptions.tsx', import.meta.url), 'utf8')

describe('dashboard recovery options', () => {
  it('offers provider-neutral and no-email starting paths', () => {
    expect(source).toContain('Import an email export')
    expect(source).toContain('Enter old accounts and usernames')
    expect(source).toContain('Upload private evidence')
    expect(source).toContain('Use guided public search')
    expect(source).toContain('Start without email')
  })

  it('routes every option inside the signed-in dashboard', () => {
    expect(source).toContain("to: '/dashboard/email-history'")
    expect(source).toContain("to: '/dashboard/identifiers'")
    expect(source).toContain("to: '/dashboard/archive'")
    expect(source).toContain("to: '/dashboard/matches'")
    expect(source).toContain("to: '/dashboard/timeline'")
  })

  it('does not restore Gmail or Outlook OAuth choices', () => {
    expect(source).not.toContain('Connect Gmail')
    expect(source).not.toContain('Connect Outlook')
  })
})
