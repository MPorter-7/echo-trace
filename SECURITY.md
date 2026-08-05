# EchoTrace security and privacy model

## Product boundary

EchoTrace is limited to self-recovery. Users agree to research only their own digital history. The MVP provides user-directed public-search links and manual source saving; it does not crawl, bypass access controls, or use data brokers. EchoTrace never starts a third-party search automatically. When a user explicitly clicks a guided search, the selected identifier is included in the destination URL and is therefore disclosed to that search provider; the interface warns about this before the click.

## Authentication

Supabase Auth owns credentials and sessions. The browser receives only the public project URL and anonymous key. Email confirmation is expected to be enabled. Dashboard routes wait for the session check and redirect unauthenticated visitors to `/login`.

The database trigger stores the confirmed signup email as an owner-only `verified_account` identifier. The reconstruction page can repair a missing copy only when the value matches the email in the authenticated JWT; RLS prevents a client from marking an unrelated address as verified.

## Row Level Security

Every private table references `auth.users` and has RLS enabled. Each operation uses an owner test against `auth.uid()`:

- `SELECT`: only the row owner
- `INSERT`: `user_id` must equal the authenticated user
- `UPDATE`: both the existing and new row must remain owned by the authenticated user
- `DELETE`: only the row owner

Anonymous users receive no private-table grants. The pre-existing public waitlist remains a separate insert-only path.

`profiles` uses its primary key (`id`) as the owner key. Child tables use foreign keys and intentional cascade behavior. An authenticated, security-invoker RPC deletes only the caller's application data, including the application profile while retaining the Auth login.

## Private files

`private-archives` is a non-public Supabase Storage bucket. Objects must use `<auth.uid()>/<random-file-name>`. Storage policies compare the first path segment with `auth.uid()` for read, insert, update, and delete. Downloads use short-lived signed URLs.

Frontend validation permits JPG, PNG, WebP, GIF, PDF, TXT, JSON, and CSV files up to 10 MB. Supabase bucket restrictions independently enforce the same size and MIME allowlist.

Delete-all first verifies the caller's archive metadata can be listed and every referenced Storage object can be removed. The database reset is not called after either operation reports an error, preventing private objects from being orphaned by metadata deletion.

## Email-history recovery

Quick Gmail Scan uses Google Identity Services' browser token flow and requests only `gmail.readonly`. The short-lived access token remains in memory, requests go directly from the browser to the Gmail API, and EchoTrace revokes the grant after each scan. The scan requests message headers and Google's short snippet—not full bodies or attachments. No refresh token, Google client secret, Gmail access token, address, subject, or snippet is sent to or stored in Supabase.

Google Takeout `.mbox` files remain an advanced fallback. They are streamed and parsed in the authenticated user's browser. The raw file, message bodies, sender addresses, and subject lines are never uploaded to Supabase or another provider. Subject examples from either method appear only in temporary local review state and disappear when the page is cleared or refreshed.

After local analysis, no finding is stored by default. The user must select findings explicitly. Stored records contain only import metadata plus aggregate service name, sender domain, evidence categories and counts, first/last dates, an explainable confidence estimate, and review status. `email_imports` and `email_findings` use owner-only RLS, and cross-table policies verify that linked imports and timeline events belong to the same authenticated user. Delete-all and data export include these tables.

The parser caps retained header and body samples and streams files instead of loading them all into memory. Quick Gmail Scan limits each pass to 5,000 likely account messages. Both methods recognize evidence patterns; they do not assert account ownership. Forwarded messages and shared inboxes can create false positives, so every finding requires user review before it can become a timeline event.

## Account deletion

Deleting application data is owner-scoped and does not need elevated credentials. Deleting a Supabase Auth user is performed only inside `supabase/functions/delete-account`, which validates the caller's JWT before using the runtime service-role secret. That secret is never bundled into the frontend.

## Confidence and sources

Match confidence is deterministic and explainable. Mutually exclusive supporting and conflicting signals cannot be counted together. Scores are estimates, never identity proof. Every match retains its public URL and retrieval timestamp, and the user makes the accept/reject decision.

## Known launch requirements

- Complete the two-user RLS tests after applying the migration.
- Complete Google OAuth verification before making Quick Gmail Scan broadly available beyond named test users.
- Review Supabase Auth rate limits, email delivery, logs, and backup settings.
- Obtain legal review of Privacy and Terms pages before commercial launch.
- Add malware scanning before raising upload limits or accepting additional file types.
- Replace permissive Edge Function CORS with the production origin if the function will be used outside Supabase's standard client flow.
