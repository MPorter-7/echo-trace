-- EchoTrace MVP schema. Idempotent and intentionally preserves public.waitlist.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identifiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('username','email','profile_url','website','display_name','custom')),
  value text not null check (char_length(value) between 1 and 500),
  normalized_value text not null check (char_length(normalized_value) between 1 and 500),
  label text check (char_length(label) <= 120),
  verification_status text not null default 'user_supplied' check (verification_status in ('verified_account','user_supplied','unverified_historical')),
  verification_method text check (char_length(verification_method) <= 160),
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, normalized_value)
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 20000),
  event_date date,
  end_date date,
  date_precision text not null default 'unknown' check (date_precision in ('exact','month','year','unknown')),
  approximate_year integer check (approximate_year between 1900 and 2200),
  approximate_month integer check (approximate_month between 1 and 12),
  platform text check (char_length(platform) <= 160),
  username_used text check (char_length(username_used) <= 500),
  event_type text not null check (event_type in ('account_created','post','photo_media','forum_activity','website','message','achievement','account_closed','platform_shutdown','recovered_memory','other')),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  tags text[] not null default '{}',
  notes text check (char_length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or event_date is null or end_date >= event_date)
);

create table if not exists public.possible_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identifier_id uuid references public.identifiers(id) on delete set null,
  platform text not null check (char_length(platform) between 1 and 160),
  result_title text not null check (char_length(result_title) between 1 and 500),
  source_url text not null check (source_url ~ '^https?://'),
  normalized_source_url text not null,
  public_description text check (char_length(public_description) <= 5000),
  discovered_at timestamptz not null default now(),
  retrieved_at timestamptz not null default now(),
  earliest_date date,
  latest_date date,
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  confidence_explanation text not null default 'No identity signals recorded.',
  matching_signals text[] not null default '{}',
  conflicting_signals text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','accepted','rejected','uncertain')),
  user_notes text check (char_length(user_notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_source_url)
);

create table if not exists public.match_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.possible_matches(id) on delete cascade,
  signal_key text not null,
  signal_label text not null,
  weight integer not null check (weight between -100 and 100),
  is_conflict boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.archive_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 180),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.event_files (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.timeline_events(id) on delete cascade,
  archive_file_id uuid not null references public.archive_files(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, archive_file_id)
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, consent_version)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (char_length(action) between 1 and 120),
  entity_type text check (char_length(entity_type) <= 80),
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists identifiers_user_type_idx on public.identifiers(user_id, type);
create index if not exists timeline_user_date_idx on public.timeline_events(user_id, event_date desc);
create index if not exists timeline_user_platform_idx on public.timeline_events(user_id, platform);
create index if not exists matches_user_status_idx on public.possible_matches(user_id, status, confidence_score desc);
create index if not exists archive_user_created_idx on public.archive_files(user_id, created_at desc);
create index if not exists activity_user_created_idx on public.activity_log(user_id, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_identifiers_updated_at on public.identifiers;
create trigger set_identifiers_updated_at before update on public.identifiers for each row execute function public.set_updated_at();
drop trigger if exists set_timeline_updated_at on public.timeline_events;
create trigger set_timeline_updated_at before update on public.timeline_events for each row execute function public.set_updated_at();
drop trigger if exists set_matches_updated_at on public.possible_matches;
create trigger set_matches_updated_at before update on public.possible_matches for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  if new.email is not null then
    insert into public.identifiers (user_id, type, value, normalized_value, label, verification_status, verification_method)
    values (new.id, 'email', lower(new.email), lower(new.email), 'Verified account email', 'verified_account', 'Verified by Supabase Auth')
    on conflict (user_id, type, normalized_value) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Create missing profiles for users who registered before this migration.
insert into public.profiles (id, display_name)
select id, nullif(raw_user_meta_data ->> 'display_name', '') from auth.users
on conflict (id) do nothing;
insert into public.identifiers (user_id, type, value, normalized_value, label, verification_status, verification_method)
select id, 'email', lower(email), lower(email), 'Verified account email', 'verified_account', 'Verified by Supabase Auth'
from auth.users where email is not null
on conflict (user_id, type, normalized_value) do nothing;

alter table public.profiles enable row level security;
alter table public.identifiers enable row level security;
alter table public.timeline_events enable row level security;
alter table public.possible_matches enable row level security;
alter table public.match_signals enable row level security;
alter table public.archive_files enable row level security;
alter table public.event_files enable row level security;
alter table public.user_consents enable row level security;
alter table public.activity_log enable row level security;

-- One owner-only policy per operation and table. WITH CHECK prevents changing ownership.
do $$
declare t text;
begin
  foreach t in array array['identifiers','timeline_events','possible_matches','match_signals','archive_files','event_files','user_consents','activity_log'] loop
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- profiles uses id as its ownership column.
drop policy if exists "owner_select" on public.profiles;
drop policy if exists "owner_insert" on public.profiles;
drop policy if exists "owner_update" on public.profiles;
drop policy if exists "owner_delete" on public.profiles;
create policy "owner_select" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "owner_insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "owner_update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "owner_delete" on public.profiles for delete to authenticated using (id = (select auth.uid()));

drop policy if exists "owner_insert" on public.identifiers;
drop policy if exists "owner_update" on public.identifiers;
create policy "owner_insert" on public.identifiers for insert to authenticated with check (
  user_id = (select auth.uid()) and (
    verification_status <> 'verified_account'
    or (type = 'email' and normalized_value = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  )
);
create policy "owner_update" on public.identifiers for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and (
    verification_status <> 'verified_account'
    or (type = 'email' and normalized_value = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  )
);

-- Cross-table checks prevent an owner from attaching guessed IDs that belong to another user.
drop policy if exists "owner_insert" on public.possible_matches;
drop policy if exists "owner_update" on public.possible_matches;
create policy "owner_insert" on public.possible_matches for insert to authenticated with check (
  user_id = (select auth.uid()) and (
    identifier_id is null or exists (select 1 from public.identifiers i where i.id = identifier_id and i.user_id = (select auth.uid()))
  )
);
create policy "owner_update" on public.possible_matches for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and (
    identifier_id is null or exists (select 1 from public.identifiers i where i.id = identifier_id and i.user_id = (select auth.uid()))
  )
);

drop policy if exists "owner_insert" on public.match_signals;
drop policy if exists "owner_update" on public.match_signals;
create policy "owner_insert" on public.match_signals for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.possible_matches m where m.id = match_id and m.user_id = (select auth.uid()))
);
create policy "owner_update" on public.match_signals for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and exists (select 1 from public.possible_matches m where m.id = match_id and m.user_id = (select auth.uid()))
);

drop policy if exists "owner_insert" on public.event_files;
drop policy if exists "owner_update" on public.event_files;
create policy "owner_insert" on public.event_files for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.timeline_events e where e.id = event_id and e.user_id = (select auth.uid()))
  and exists (select 1 from public.archive_files f where f.id = archive_file_id and f.user_id = (select auth.uid()))
);
create policy "owner_update" on public.event_files for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.timeline_events e where e.id = event_id and e.user_id = (select auth.uid()))
  and exists (select 1 from public.archive_files f where f.id = archive_file_id and f.user_id = (select auth.uid()))
);

drop policy if exists "owner_insert" on public.archive_files;
drop policy if exists "owner_update" on public.archive_files;
create policy "owner_insert" on public.archive_files for insert to authenticated with check (
  user_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%'
);
create policy "owner_update" on public.archive_files for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%'
);

revoke all on public.profiles, public.identifiers, public.timeline_events, public.possible_matches, public.match_signals, public.archive_files, public.event_files, public.user_consents, public.activity_log from anon;
grant select, insert, update, delete on public.profiles, public.identifiers, public.timeline_events, public.possible_matches, public.match_signals, public.archive_files, public.event_files, public.user_consents, public.activity_log to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-archives', 'private-archives', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/json','text/csv'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "archive_owner_select" on storage.objects;
drop policy if exists "archive_owner_insert" on storage.objects;
drop policy if exists "archive_owner_update" on storage.objects;
drop policy if exists "archive_owner_delete" on storage.objects;
create policy "archive_owner_select" on storage.objects for select to authenticated using (bucket_id = 'private-archives' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "archive_owner_insert" on storage.objects for insert to authenticated with check (bucket_id = 'private-archives' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "archive_owner_update" on storage.objects for update to authenticated using (bucket_id = 'private-archives' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'private-archives' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "archive_owner_delete" on storage.objects for delete to authenticated using (bucket_id = 'private-archives' and (storage.foldername(name))[1] = (select auth.uid())::text);

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
  delete from public.timeline_events where user_id = current_user_id;
  delete from public.identifiers where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
end;
$$;
revoke all on function public.delete_my_application_data() from public, anon;
grant execute on function public.delete_my_application_data() to authenticated;
