# EchoTrace setup

These steps connect the completed frontend to Supabase and Vercel. The migrations are idempotent and do not reset or remove the existing `waitlist` table.

## 1. Local environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

In Supabase, open **Project Settings → API** and add:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
```

Use only the public anonymous key. Never copy the service-role key into a Vite variable, browser file, commit, or chat.

## 2. Apply the database migrations

This is a production database action. Review the SQL first and make a Supabase backup before applying it.

1. Open **Supabase → SQL Editor → New query**.
2. For a fresh project, run every file in `supabase/migrations` in filename order.
3. For a project that already ran `202608030001_echotrace_mvp.sql`, run each newer migration it has not yet applied, in filename order. The Email History Upload release adds `202608040002_email_history_upload.sql`.
4. Confirm the existing `waitlist` table and its anonymous insert policy still exist.
5. Confirm the `private-archives` Storage bucket is marked private.

The base migration creates private application tables, constraints, indexes, timestamps, owner-only RLS policies, Storage policies, a profile trigger, and a delete-my-data function. The forward migrations repair that function and add owner-isolated aggregate email-import records. The raw `.mbox` is processed locally and never placed in Storage. The migrations can be rerun safely.

## 3. Configure Supabase Authentication

In **Authentication → URL Configuration**:

- Site URL: `https://echo-trace-eight.vercel.app`
- Additional redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/reset-password`
  - `https://echo-trace-eight.vercel.app/auth/callback`
  - `https://echo-trace-eight.vercel.app/reset-password`

In **Authentication → Providers → Email**, enable Email and Confirm email. Social providers are not used.

Customize email templates if desired, but preserve the generated confirmation and recovery links.

## 4. Deploy secure account deletion

The frontend can delete all application records without elevated credentials. Deleting the Auth user requires the included Edge Function.

With the Supabase CLI linked to this project:

```bash
supabase functions deploy delete-account
```

Supabase automatically supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to its function runtime. Do not expose those values to Vercel.

## 5. Configure Vercel

In **Vercel → echo-trace → Settings → Environment Variables**, add the same two public Vite variables for Production, Preview, and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Redeploy after saving. `vercel.json` rewrites client routes such as `/dashboard/timeline` to the Vite application.

## 6. Required post-deploy checks

1. Submit the public waitlist and confirm the row appears.
2. Create and verify a new account.
3. Test login, logout, forgot password, and password reset.
4. Accept the self-recovery consent.
5. Complete the two-user RLS test in TESTING.md.
6. Test identifier, Email History Upload, timeline, match, archive, export, and deletion flows. During `.mbox` analysis, verify in browser network tools that raw email data is never sent. For delete-all, simulate a failed Storage request and confirm database records remain.
7. Confirm `/privacy`, `/terms`, and direct dashboard URLs load on Vercel.
