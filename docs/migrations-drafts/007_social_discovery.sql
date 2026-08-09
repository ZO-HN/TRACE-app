-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/. Backs the Social tab's Connected/Discover lists.
--
-- Assumes public.profiles has coach_id and role columns (per AGENTS.md:
-- "handle_new_user() defaults [role] to 'trainee' and auto-assigns
-- coach_id from platform_settings.default_coach_id") — verify both exist
-- with those exact names before applying.
--
-- SECURITY DEFINER so trainees can see each other's names despite RLS
-- normally restricting profiles to the owner's own row. Deliberately
-- narrow: only id + a display name, only same-coach trainees, never the
-- caller's own row. Do NOT widen the returned columns without reviewing
-- what's safe to expose to peers (e.g. no email/DOB/etc.).
create or replace function public.list_coach_roster()
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, coalesce(p.first_name || ' ' || p.last_name, 'Athlete')
  from public.profiles p
  where p.coach_id = (select coach_id from public.profiles where id = auth.uid())
    and p.id <> auth.uid()
    and p.role = 'trainee'
  order by p.first_name
  limit 200;
$$;

grant execute on function public.list_coach_roster() to authenticated;
