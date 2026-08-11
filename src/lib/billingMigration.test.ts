import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202608110001_stripe_billing.sql', import.meta.url), 'utf8')

describe('billing migration', () => {
  it('keeps entitlement writes server-only and owner reads isolated', () => {
    expect(migration).toContain('alter table public.billing_entitlements enable row level security')
    expect(migration).toContain('using (user_id = (select auth.uid()))')
    expect(migration).toContain('grant select on public.billing_entitlements to authenticated')
    expect(migration).not.toContain('grant insert')
  })

  it('requires paid access for archive inserts without blocking reads or deletion', () => {
    expect(migration).toContain("b.recovery_owned or b.subscription_status in ('active','trialing')")
    expect(migration).toContain('drop policy if exists "archive_owner_insert"')
    expect(migration).not.toContain('drop policy if exists "archive_owner_select"')
    expect(migration).not.toContain('drop policy if exists "archive_owner_delete"')
  })
})
