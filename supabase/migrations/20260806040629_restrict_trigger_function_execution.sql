-- Trigger helpers run only through their attached database triggers.
-- SECURITY DEFINER functions must never inherit PostgreSQL's default PUBLIC execute grant.
revoke all on function public.handle_new_user() from public, anon, authenticated;
