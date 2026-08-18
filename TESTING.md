# EchoTrace testing

## Automated checks

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Unit tests cover authentication redirect decisions, email-first reconstruction state, streamed `.mbox` parsing, evidence classification, duplicate-service merging, weak/spam result cleanup (including a 623-result regression fixture), identifier and timeline validation, deterministic confidence scoring, mutually exclusive evidence, date-range conversion, partial attachment failures, storage-first deletion sequencing, URL normalization, CSV quoting, file restrictions, and the ownership rule expected by RLS.

## Manual authentication tests

1. Create an account and confirm the verification email is required.
2. Verify the account, sign in, refresh, and confirm the session persists.
3. Sign out and confirm a dashboard URL redirects to `/login`.
4. Request a reset link, change the password, and sign in with it.
5. Confirm authenticated visitors to `/login` and `/signup` redirect to `/dashboard`.

## Mandatory two-user RLS test

Use two separate private browser profiles.

1. Register and verify User A and User B.
2. As User A, add one identifier, event, match, archive file, email import, and email finding.
3. Record their UUIDs from User A's network responses or Supabase Table Editor.
4. As User B, use the browser console with User B's Supabase client to select, update, and delete those exact UUIDs.
5. Every request must return zero accessible rows or an RLS denial. No User A content or signed file URL may be returned.
6. Attempt to insert a row with User A's `user_id` while authenticated as User B. RLS must reject it.
7. Repeat a direct Storage download and delete attempt against User A's object path. Both must fail.
8. Repeat the direct-ID attempts against User A's `email_imports` and `email_findings` rows, including an attempt to link User B's finding to User A's timeline event. Every operation must fail or return no accessible rows.
9. As an anonymous visitor, query every private table. All must fail or return no accessible rows.
10. Submit the public waitlist anonymously. That insert must still succeed, while select/update/delete remain unavailable.

## Feature checks

- Reconstruction: confirmed signup email appears without re-entry; missing verified identifier repairs only for the authenticated email; the primary action opens Find My Accounts; readiness changes with identifiers, imports, and findings
- Provider-neutral email export: reject empty/non-`.mbox` files; analyze representative Google Takeout, Yahoo, Proton Mail, Apple Mail, or Thunderbird `.mbox` fixtures; verify progress and local-only subject examples; confirm Outlook `.pst` is rejected with conversion guidance
- Email-history privacy: use browser network tools to confirm every provider's raw `.mbox` remains on-device and only selected aggregate rows reach Supabase
- Identifiers: create, edit, duplicate prevention, delete, URL/email validation, historical email label
- Timeline: all date precisions, required month selection, CRUD, failed archive attachment reporting, search, platform/type/confidence filters, both sorts, both views, source URL
- Matches: guided links, case-sensitive URL path/query preservation, duplicate URL prevention, mutually exclusive scoring signals, explanations, accept/reject/uncertain, accepted date-range conversion
- Archive: every allowed MIME type, rejected type, zero-byte and oversized files, signed download, event link, deletion
- Export: JSON and CSV with empty and populated tables; verify quotes and Unicode
- Deletion: individual records, email-import cascade, delete-all history after export, profile removal, failed Storage cleanup aborting database deletion, Edge Function account deletion
- Public site: landing animations, navigation, Request Access modal, permanent Supabase waitlist row
- Responsive/accessibility: keyboard-only flow, visible focus, mobile navigation, reduced-motion preference, labels and error announcements

## What cannot be verified offline

Email delivery, live Auth redirects, production RLS, Storage isolation, Vercel environment values, and the public waitlist require configured deployments. Do not report these as working until the post-deploy checks in SETUP.md pass.
