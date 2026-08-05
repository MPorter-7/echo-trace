import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202608040003_gmail_quick_scan.sql', import.meta.url), 'utf8')

describe('Quick Gmail Scan migration', () => {
  it('records an explicit source and permits zero bytes when no file is uploaded', () => {
    expect(migration).toContain("source_kind text not null default 'mbox'")
    expect(migration).toContain("check (size_bytes >= 0)")
    expect(migration).toContain("source_kind in ('gmail', 'mbox')")
  })
})
