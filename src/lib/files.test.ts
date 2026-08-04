import { describe, expect, it } from 'vitest'
import { validateArchiveFile } from './files'

describe('archive file validation', () => {
  it('accepts a supported file within 10 MB', () => expect(validateArchiveFile({ name: 'evidence.pdf', size: 1000, type: 'application/pdf' }).valid).toBe(true))
  it('rejects oversized and unsupported files', () => {
    expect(validateArchiveFile({ name: 'large.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' }).valid).toBe(false)
    expect(validateArchiveFile({ name: 'script.js', size: 100, type: 'text/javascript' }).valid).toBe(false)
  })
})
