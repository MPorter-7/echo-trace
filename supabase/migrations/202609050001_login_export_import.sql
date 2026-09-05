-- Saved-Logins Import: password-manager and browser CSV exports (Chrome, Firefox, Edge,
-- Safari, Bitwarden, 1Password, LastPass, ...) are parsed locally in the browser. A saved
-- login is direct evidence of an account, so this is a stronger signal than inferring
-- accounts from email content. No column here can ever hold a password or secret; only
-- the site, service name, and usernames the user approves are stored.
create table if not exists public.login_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null check (char_length(original_name) between 1 and 180),
  size_bytes bigint not null check (size_bytes > 0),
  source_kind text not null default 'csv' check (source_kind = 'csv'),
  rows_scanned integer not null check (rows_scanned >= 0),
  candidate_rows integer not null check (candidate_rows >= 0 and candidate_rows <= rows_scanned),
  findings_count integer not null check (findings_count >= 0),
  processed_locally boolean not null default true check (processed_locally = true),
  created_at timestamptz not null default now()
);

create table if not exists public.login_export_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.login_exports(id) on delete cascade,
  service_name text not null check (char_length(service_name) between 1 and 160),
  domain text not null check (char_length(domain) between 3 and 253),
  usernames text[] not null default '{}' check (cardinality(usernames) <= 8),
  row_count integer not null check (row_count > 0),
  confidence_score integer not null check (confidence_score between 0 and 100),
  confidence_explanation text not null check (char_length(confidence_explanation) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','uncertain')),
  timeline_event_id uuid references public.timeline_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_id, domain)
);

create index if not exists login_exports_user_created_idx on public.login_exports(user_id, created_at desc);
create index if not exists login_export_findings_user_status_idx on public.login_export_findings(user_id, status, confidence_score desc);

drop trigger if exists set_login_export_findings_updated_at on public.login_export_findings;
create trigger set_login_export_findings_updated_at before update on public.login_export_findings for each row execute function public.set_updated_at();

alter table public.login_exports enable row level security;
alter table public.login_export_findings enable row level security;

drop policy if exists "owner_select" on public.login_exports;
drop policy if exists "owner_insert" on public.login_exports;
drop policy if exists "owner_update" on public.login_exports;
drop policy if exists "owner_delete" on public.login_exports;
create policy "owner_select" on public.login_exports for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_insert" on public.login_exports for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner_update" on public.login_exports for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner_delete" on public.login_exports for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "owner_select" on public.login_export_findings;
drop policy if exists "owner_insert" on public.login_export_findings;
drop policy if exists "owner_update" on public.login_export_findings;
drop policy if exists "owner_delete" on public.login_export_findings;
create policy "owner_select" on public.login_export_findings for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_insert" on public.login_export_findings for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.login_exports i where i.id = import_id and i.user_id = (select auth.uid()))
  and (timeline_event_id is null or exists (select 1 from public.timeline_events e where e.id = timeline_event_id and e.user_id = (select auth.uid())))
);
create policy "owner_update" on public.login_export_findings for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.login_exports i where i.id = import_id and i.user_id = (select auth.uid()))
  and (timeline_event_id is null or exists (select 1 from public.timeline_events e where e.id = timeline_event_id and e.user_id = (select auth.uid())))
);
create policy "owner_delete" on public.login_export_findings for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.login_exports, public.login_export_findings from anon;
grant select, insert, update, delete on public.login_exports, public.login_export_findings to authenticated;

-- Keep delete-all complete after adding the two new owner-only tables.
create or replace function public.delete_my_application_data()
returns void language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.activity_log where user_id = current_user_id;
  delete from public.user_consents where user_id = current_user_id;
  delete from public.event_files where user_id = current_user_id;
  delete from public.archive_files where user_id = current_user_id;
  delete from public.match_signals where user_id = current_user_id;
  delete from public.possible_matches where user_id = current_user_id;
  delete from public.login_exports where user_id = current_user_id;
  delete from public.email_imports where user_id = current_user_id;
  delete from public.timeline_events where user_id = current_user_id;
  delete from public.identifiers where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
end;
$$;
revoke all on function public.delete_my_application_data() from public, anon;
grant execute on function public.delete_my_application_data() to authenticated;
