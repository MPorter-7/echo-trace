import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const legalPages = readFileSync(new URL('./LegalPages.tsx', import.meta.url), 'utf8')

describe('Public legal pages', () => {
  it('discloses that legal review is still pending', () => {
    expect(legalPages).toMatch(/pending legal review/i)
  })

  it('publishes privacy content covering local email-history imports', () => {
    expect(legalPages).toContain('Email-history files')
    expect(legalPages).toContain('What can be saved from an import')
    expect(legalPages).toContain('locally in your browser')
    expect(legalPages).not.toContain('gmail.readonly')
    expect(legalPages).toContain('Retention and deletion')
    expect(legalPages).toContain('mporter84@email.com')
  })
})
