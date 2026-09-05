import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202609050001_login_export_import.sql', import.meta.url), 'utf8')

describe('saved-logins persistence migration', () => {
  it('stores only aggregate import and finding records behind RLS', () => {
    expect(migration).toContain('create table if not exists public.login_exports')
    expect(migration).toContain('create table if not exists public.login_export_findings')
    expect(migration).toContain('processed_locally boolean not null default true')
    expect(migration).toContain('alter table public.login_exports enable row level security')
    expect(migration).toContain('alter table public.login_export_findings enable row level security')
    expect(migration).toContain('i.user_id = (select auth.uid())')
  })

  it('never defines a column capable of storing a saved password or secret', () => {
    expect(migration).not.toMatch(/\bpassword\w*\s+text/i)
    expect(migration).not.toMatch(/\bsecret\w*\s+text/i)
    expect(migration).not.toMatch(/\btotp\w*\s+text/i)
  })

  it('bounds each stored username to the timeline field length limit through an immutable helper function, not a CHECK subquery', () => {
    expect(migration).toContain('public.max_text_array_element_length(usernames) <= 320')
    expect(migration).toContain('returns integer language sql immutable')
    expect(migration).not.toMatch(/usernames[^;]*check\s*\([^;]*exists\s*\(\s*select/is)
  })

  it('includes login exports in delete-all application data', () => {
    expect(migration).toContain('delete from public.login_exports where user_id = current_user_id')
    expect(migration).toContain('delete from public.profiles where id = current_user_id')
  })
})
