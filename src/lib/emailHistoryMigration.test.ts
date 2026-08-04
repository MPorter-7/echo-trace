import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202608040002_email_history_upload.sql', import.meta.url), 'utf8')

describe('email history persistence migration', () => {
  it('stores only aggregate import and finding records behind RLS', () => {
    expect(migration).toContain('create table if not exists public.email_imports')
    expect(migration).toContain('create table if not exists public.email_findings')
    expect(migration).toContain('processed_locally boolean not null default true')
    expect(migration).toContain('alter table public.email_imports enable row level security')
    expect(migration).toContain('alter table public.email_findings enable row level security')
    expect(migration).toContain('i.user_id = (select auth.uid())')
    expect(migration).not.toMatch(/message_body|raw_message|subject_line/i)
  })

  it('includes email imports in delete-all application data', () => {
    expect(migration).toContain('delete from public.email_imports where user_id = current_user_id')
    expect(migration).toContain('delete from public.profiles where id = current_user_id')
  })
})
