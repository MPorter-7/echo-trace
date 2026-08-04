# EchoTrace security and privacy model

## Product boundary

EchoTrace is limited to self-recovery. Users agree to research only their own digital history. The MVP provides user-directed public-search links and manual source saving; it does not crawl, bypass access controls, use data brokers, or send private identifiers to third parties.

## Authentication

Supabase Auth owns credentials and sessions. The browser receives only the public project URL and anonymous key. Email confirmation is expected to be enabled. Dashboard routes wait for the session check and redirect unauthenticated visitors to `/login`.

## Row Level Security

Every private table references `auth.users` and has RLS enabled. Each operation uses an owner test against `auth.uid()`:

- `SELECT`: only the row owner
- `INSERT`: `user_id` must equal the authenticated user
- `UPDATE`: both the existing and new row must remain owned by the authenticated user
- `DELETE`: only the row owner

Anonymous users receive no private-table grants. The pre-existing public waitlist remains a separate insert-only path.

`profiles` uses its primary key (`id`) as the owner key. Child tables use foreign keys and intentional cascade behavior. An authenticated, security-invoker RPC deletes only the caller's application data.

## Private files

`private-archives` is a non-public Supabase Storage bucket. Objects must use `<auth.uid()>/<random-file-name>`. Storage policies compare the first path segment with `auth.uid()` for read, insert, update, and delete. Downloads use short-lived signed URLs.

Frontend validation permits JPG, PNG, WebP, GIF, PDF, TXT, JSON, and CSV files up to 10 MB. Supabase bucket restrictions independently enforce the same size and MIME allowlist.

## Account deletion

Deleting application data is owner-scoped and does not need elevated credentials. Deleting a Supabase Auth user is performed only inside `supabase/functions/delete-account`, which validates the caller's JWT before using the runtime service-role secret. That secret is never bundled into the frontend.

## Confidence and sources

Match confidence is deterministic and explainable. Supporting and conflicting signals are stored with the resulting score. Scores are estimates, never identity proof. Every match retains its public URL and retrieval timestamp, and the user makes the accept/reject decision.

## Known launch requirements

- Complete the two-user RLS tests after applying the migration.
- Review Supabase Auth rate limits, email delivery, logs, and backup settings.
- Obtain legal review of Privacy and Terms pages before commercial launch.
- Add malware scanning before raising upload limits or accepting additional file types.
- Replace permissive Edge Function CORS with the production origin if the function will be used outside Supabase's standard client flow.
