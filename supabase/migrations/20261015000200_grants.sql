-- New Supabase projects don't expose tables to the API roles automatically.
-- Signed-in users get table privileges; row-level security policies still decide
-- which rows each member can see or change. Anonymous callers get nothing.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Functions: only signed-in users may call them (each one checks who is calling).
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- Tee-sheet generation is for staff, or the SQL editor (no signed-in user).
create or replace function public.generate_tee_slots(p_day date, p_first time, p_last time, p_minutes int)
returns int
language plpgsql security definer set search_path = public as $$
declare v_t time := p_first; v_n int := 0;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Staff only'; end if;
  if auth.uid() is null and session_user not in ('postgres', 'supabase_admin') then raise exception 'Staff only'; end if;
  while v_t <= p_last loop
    insert into tee_slots (starts_at) values ((p_day + v_t) at time zone 'Europe/London')
    on conflict (starts_at) do nothing;
    v_n := v_n + 1;
    v_t := v_t + make_interval(mins => p_minutes);
  end loop;
  return v_n;
end $$;
revoke execute on function public.generate_tee_slots(date, time, time, int) from public, anon;

-- Apply the same to anything created later.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated;
