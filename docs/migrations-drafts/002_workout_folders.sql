-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/. Touches workout_templates, a table that repo owns —
-- review carefully before applying (see caveat below).
--
-- Folders are a trainee-side organizational construct, not a mutation of
-- coach-authored template content: a coach's ASSIGNED template can be
-- foldered by the trainee viewing it without changing who owns/edits the
-- template itself. If that's not the intended semantics, rename
-- folder_id -> user_folder_id to make the distinction unambiguous.

create table if not exists public.workout_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workout_folders enable row level security;

create policy "workout_folders_owner_all"
  on public.workout_folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.workout_templates
  add column if not exists folder_id uuid references public.workout_folders(id) on delete set null;
