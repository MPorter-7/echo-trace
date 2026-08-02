# EchoTrace permanent waitlist setup

The site works without Supabase and stores signups in the current browser. Complete these steps to store signups permanently.

1. Create a new Supabase project under an email you control.
2. Open **SQL Editor**, paste the contents of `supabase/waitlist.sql`, and run it.
3. Open **Project Settings > API** and copy the project URL and public anonymous key.
4. In the `app` folder, create `.env.local` from the example:

   ```bash
   cp .env.example .env.local
   ```

5. Edit `.env.local` and replace both example values. Use only the public anonymous key - never the service-role key.
6. Restart the development server:

   ```bash
   npm run dev
   ```

New submissions will appear in **Table Editor > waitlist**. Public visitors may insert an email but cannot read, update, or delete the list.

