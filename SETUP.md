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

Use only the public Supabase anonymous key. Never copy a service-role key into a Vite variable, browser file, commit, or chat.

## 2. Apply the database migrations

This is a production database action. Review the SQL first and make a Supabase backup before applying it.

1. Open **Supabase → SQL Editor → New query**.
2. For a fresh project, run every file in `supabase/migrations` in filename order.
3. For a project that already ran `202608030001_echotrace_mvp.sql`, run each newer migration it has not yet applied, in filename order. Email History Upload adds `202608040002_email_history_upload.sql`. The provider-neutral upload flow accepts `.mbox` exports and requires no external email API configuration. Saved-Logins Import adds `202609050001_login_export_import.sql` and accepts `.csv` exports from browsers and password managers; no column in that migration can hold a password or secret.
4. Confirm the existing `waitlist` table and its anonymous insert policy still exist.
5. Confirm the `private-archives` Storage bucket is marked private.

The base migration creates private application tables, constraints, indexes, timestamps, owner-only RLS policies, Storage policies, a profile trigger, and a delete-my-data function. The forward migrations repair that function and add owner-isolated aggregate email-import records. The raw `.mbox` export—whether from Yahoo, Proton Mail, Apple Mail, Thunderbird, Google Takeout, or another compatible source—is processed locally and never placed in Storage. Outlook `.pst` exports must be converted to `.mbox` before import. The migrations can be rerun safely.

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

## 4. Email-history import

No email-provider API, OAuth client, Google Cloud configuration, or Gmail scope is required for the default flow. Customers export a mailbox they control as a Google Takeout `.zip` (extracted in the browser) or an already-extracted `.mbox` file, then EchoTrace analyzes it locally.

## 5. Optional: live Gmail connect (beta)

This is an alternative to the `.mbox`/`.zip` import above, not a requirement. It lets a user click "Connect Gmail" instead of exporting a file; EchoTrace calls `gmail.googleapis.com` directly from the browser with a token that stays in memory for one scan. Skip this section entirely if you only want the file-import flow — nothing below is required for EchoTrace to work.

**What this costs you if you turn it on.** `gmail.readonly` is a Google "restricted" OAuth scope. In **Testing** publishing status (the default, and what these steps set up) it is free and instant, but capped at 100 Google accounts that you must individually add as testers, and each of those users sees Google's "unverified app" warning before continuing. Moving to **Production** so any user can connect removes that cap, but requires Google's manual OAuth review (routinely weeks) and an annual third-party CASA Tier 2 security assessment — cost varies a lot by assessor, so get real quotes from the [App Defense Alliance's lab list](https://appdefensealliance.dev/casa) rather than assuming a number. Do not publish to Production until you've decided that cost is worth it.

1. In [Google Cloud Console](https://console.cloud.google.com), select (or create) the project backing `echo-trace.com`, then **APIs & Services → Enabled APIs → Enable APIs** and enable the **Gmail API**.
2. **APIs & Services → OAuth consent screen**:
   - User type: External
   - App name / support email / logo as already configured for this project
   - Scopes → add `https://www.googleapis.com/auth/gmail.readonly`, with a justification along the lines of: "Used only to scan message headers and subjects locally in the user's browser to detect historical account-creation evidence for the user's own private digital-history timeline. No Gmail content is transmitted to or stored on EchoTrace's servers."
   - Test users → add the Google accounts (yours plus any beta testers) that should be able to use this, up to 100
   - Leave publishing status as **Testing** unless you have specifically decided to pursue Production verification (see cost note above)
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Application type: Web application
   - Name: something distinguishing, e.g. "EchoTrace Live Gmail (browser-only)"
   - Authorized JavaScript origins: `https://www.echo-trace.com`, `https://echo-trace.com`, and `http://localhost:3000` for local development
   - Authorized redirect URIs: leave empty — the app uses Google's token client model, not a redirect
   - Copy the generated Client ID (`....apps.googleusercontent.com`); it is not a secret, it only identifies which app is asking
4. Add it as `VITE_GOOGLE_CLIENT_ID` in `.env.local` for local development and in Vercel's environment variables (step 6 below) for production. The "Connect Gmail" button is hidden entirely whenever this variable is unset — there is no half-configured state visible to users.

## 6. Deploy secure account deletion

The frontend can delete all application records without elevated credentials. Deleting the Auth user requires the included Edge Function.

With the Supabase CLI linked to this project:

```bash
supabase functions deploy delete-account
```

Supabase automatically supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to its function runtime. Do not expose those values to Vercel.
The function requires a valid user JWT, accepts browser calls only from the production site or local development, verifies Storage deletion, and stops before deleting the Auth account if archive cleanup fails.

## 7. Configure Vercel

In **Vercel → echo-trace → Settings → Environment Variables**, add the same two public Vite variables for Production, Preview, and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Add `VITE_GOOGLE_CLIENT_ID` too, only if you completed step 5 above.

Redeploy after saving. `vercel.json` rewrites client routes such as `/dashboard/timeline` to the Vite application.

## 8. Required post-deploy checks

1. Submit the public waitlist and confirm the row appears.
2. Create and verify a new account.
3. Test login, logout, forgot password, and password reset.
4. Accept the self-recovery consent.
5. Complete the two-user RLS test in TESTING.md.
6. Test identifier, provider-neutral `.mbox`/Takeout-`.zip` upload, saved-logins `.csv` upload, timeline, match, archive, export, and deletion flows. Verify raw mailbox data and saved passwords are never sent and only selected aggregate findings reach Supabase. For delete-all, simulate a failed Storage request and confirm database records remain. If `VITE_GOOGLE_CLIENT_ID` is set, also connect Gmail with a test-user account and confirm the Network tab shows requests only to `gmail.googleapis.com`/`accounts.google.com`, never to EchoTrace's own backend.
7. Confirm `/privacy`, `/terms`, `/refunds`, and direct dashboard URLs load on Vercel.
8. Confirm `https://echo-trace.com` and `https://www.echo-trace.com` are the intended production origins and are included in Supabase Edge Function CORS configuration.
9. Confirm Stripe Checkout and the customer billing portal use the production `SITE_URL` and that the Stripe portal permits cancellation.
10. Confirm the published Terms, Privacy Notice, and Refund & Cancellation Policy have received qualified legal review before taking real customer payments.
