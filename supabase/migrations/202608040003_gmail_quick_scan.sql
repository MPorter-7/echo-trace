-- Quick Gmail Scan has no uploaded file, so size_bytes is zero and the source is explicit.
alter table public.email_imports
  add column if not exists source_kind text not null default 'mbox';

alter table public.email_imports
  drop constraint if exists email_imports_size_bytes_check;
alter table public.email_imports
  add constraint email_imports_size_bytes_check check (size_bytes >= 0);

alter table public.email_imports
  drop constraint if exists email_imports_source_kind_check;
alter table public.email_imports
  add constraint email_imports_source_kind_check check (source_kind in ('gmail', 'mbox'));
