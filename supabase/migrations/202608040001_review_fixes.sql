-- Forward-only repair for projects that already applied the EchoTrace MVP migration.
-- Storage objects must be removed successfully by the client before this function runs.
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
