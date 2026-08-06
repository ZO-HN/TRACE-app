-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/. Largest of the drafted migrations in this batch
-- (four new tables) — give this the most review lead time.

create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.custom_foods enable row level security;
create policy "custom_foods_owner_all" on public.custom_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Denormalized name+macro snapshot, not a pointer into custom_foods /
-- nutrition_logs, so favoriting survives edits/deletes of the source.
create table if not exists public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.favorite_foods enable row level security;
create policy "favorite_foods_owner_all" on public.favorite_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference data, coach/admin-seeded — clients read only, no client writes.
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.supplements enable row level security;
create policy "supplements_read_all" on public.supplements
  for select using (auth.role() = 'authenticated');

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.meal_templates enable row level security;
create policy "meal_templates_owner_all" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  meal_template_id uuid not null references public.meal_templates(id) on delete cascade,
  "order" smallint not null default 0,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer
);

alter table public.meal_template_items enable row level security;
create policy "meal_template_items_owner_all" on public.meal_template_items
  for all
  using (exists (
    select 1 from public.meal_templates t
    where t.id = meal_template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.meal_templates t
    where t.id = meal_template_id and t.user_id = auth.uid()
  ));
