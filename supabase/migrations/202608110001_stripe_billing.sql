create table if not exists public.billing_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  recovery_owned boolean not null default false,
  recovery_purchased_at timestamptz,
  stripe_subscription_id text unique,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive','trialing','active','past_due','unpaid','canceled','incomplete','incomplete_expired','paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_entitlements enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "owner_select" on public.billing_entitlements;
create policy "owner_select" on public.billing_entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.billing_entitlements from anon;
revoke all on public.stripe_webhook_events from anon, authenticated;
grant select on public.billing_entitlements to authenticated;

create index if not exists billing_customer_idx on public.billing_entitlements(stripe_customer_id);
create index if not exists billing_subscription_idx on public.billing_entitlements(stripe_subscription_id);

-- Evidence uploads are a Recovery-or-Vault entitlement. Reads and deletion stay
-- available so a downgraded customer can always retrieve or remove their data.
drop policy if exists "owner_insert" on public.archive_files;
create policy "owner_insert" on public.archive_files for insert to authenticated with check (
  user_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/%'
  and exists (
    select 1 from public.billing_entitlements b
    where b.user_id = (select auth.uid())
      and (b.recovery_owned or b.subscription_status in ('active','trialing'))
  )
);

drop policy if exists "archive_owner_insert" on storage.objects;
create policy "archive_owner_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'private-archives'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.billing_entitlements b
    where b.user_id = (select auth.uid())
      and (b.recovery_owned or b.subscription_status in ('active','trialing'))
  )
);
