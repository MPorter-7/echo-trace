import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const legalPages = readFileSync(new URL('./LegalPages.tsx', import.meta.url), 'utf8')

describe('Public legal pages', () => {
  it('publishes a finalized privacy notice with Google API disclosures', () => {
    expect(legalPages).not.toMatch(/MVP draft|Legal review required/i)
    expect(legalPages).toContain('https://www.googleapis.com/auth/gmail.readonly')
    expect(legalPages).toContain('How Gmail data is processed')
    expect(legalPages).toContain('What can be saved from a Gmail scan')
    expect(legalPages).toContain('Google API Limited Use')
    expect(legalPages).toContain('Retention and deletion')
    expect(legalPages).toContain('mporter84@email.com')
  })
})
