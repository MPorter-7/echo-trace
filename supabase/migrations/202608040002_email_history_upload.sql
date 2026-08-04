-- Email History Upload: raw .mbox files are processed locally in the browser.
-- Only user-selected aggregate import metadata and findings are stored here.
create table if not exists public.email_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null check (char_length(original_name) between 1 and 180),
  size_bytes bigint not null check (size_bytes > 0),
  messages_scanned integer not null check (messages_scanned >= 0),
  candidate_messages integer not null check (candidate_messages >= 0 and candidate_messages <= messages_scanned),
  findings_count integer not null check (findings_count >= 0),
  processed_locally boolean not null default true check (processed_locally = true),
  created_at timestamptz not null default now()
);

create table if not exists public.email_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.email_imports(id) on delete cascade,
  service_name text not null check (char_length(service_name) between 1 and 160),
  sender_domain text not null check (char_length(sender_domain) between 3 and 253),
  evidence_types text[] not null check (
    cardinality(evidence_types) > 0
    and evidence_types <@ array['account_signup','email_verification','password_reset','receipt','account_notice']::text[]
  ),
  evidence_counts jsonb not null default '{}',
  first_seen date,
  last_seen date,
  message_count integer not null check (message_count > 0),
  confidence_score integer not null check (confidence_score between 0 and 100),
  confidence_explanation text not null check (char_length(confidence_explanation) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','uncertain')),
  timeline_event_id uuid references public.timeline_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_id, sender_domain),
  check (last_seen is null or first_seen is null or last_seen >= first_seen)
);

create index if not exists email_imports_user_created_idx on public.email_imports(user_id, created_at desc);
create index if not exists email_findings_user_status_idx on public.email_findings(user_id, status, confidence_score desc);

drop trigger if exists set_email_findings_updated_at on public.email_findings;
create trigger set_email_findings_updated_at before update on public.email_findings for each row execute function public.set_updated_at();

alter table public.email_imports enable row level security;
alter table public.email_findings enable row level security;

drop policy if exists "owner_select" on public.email_imports;
drop policy if exists "owner_insert" on public.email_imports;
drop policy if exists "owner_update" on public.email_imports;
drop policy if exists "owner_delete" on public.email_imports;
create policy "owner_select" on public.email_imports for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_insert" on public.email_imports for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner_update" on public.email_imports for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner_delete" on public.email_imports for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "owner_select" on public.email_findings;
drop policy if exists "owner_insert" on public.email_findings;
drop policy if exists "owner_update" on public.email_findings;
drop policy if exists "owner_delete" on public.email_findings;
create policy "owner_select" on public.email_findings for select to authenticated using (user_id = (select auth.uid()));
create policy "owner_insert" on public.email_findings for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.email_imports i where i.id = import_id and i.user_id = (select auth.uid()))
  and (timeline_event_id is null or exists (select 1 from public.timeline_events e where e.id = timeline_event_id and e.user_id = (select auth.uid())))
);
create policy "owner_update" on public.email_findings for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.email_imports i where i.id = import_id and i.user_id = (select auth.uid()))
  and (timeline_event_id is null or exists (select 1 from public.timeline_events e where e.id = timeline_event_id and e.user_id = (select auth.uid())))
);
create policy "owner_delete" on public.email_findings for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.email_imports, public.email_findings from anon;
grant select, insert, update, delete on public.email_imports, public.email_findings to authenticated;

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
  delete from public.email_imports where user_id = current_user_id;
  delete from public.timeline_events where user_id = current_user_id;
  delete from public.identifiers where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
end;
$$;
revoke all on function public.delete_my_application_data() from public, anon;
grant execute on function public.delete_my_application_data() to authenticated;
