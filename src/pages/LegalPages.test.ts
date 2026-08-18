import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const legalPages = readFileSync(new URL('./LegalPages.tsx', import.meta.url), 'utf8')

describe('Public legal pages', () => {
  it('publishes a finalized privacy notice for local email-history imports', () => {
    expect(legalPages).not.toMatch(/MVP draft|Legal review required/i)
    expect(legalPages).toContain('Email-history files')
    expect(legalPages).toContain('What can be saved from an import')
    expect(legalPages).toContain('locally in your browser')
    expect(legalPages).not.toContain('gmail.readonly')
    expect(legalPages).toContain('Retention and deletion')
    expect(legalPages).toContain('mporter84@email.com')
  })
})
