-- Our Tracker: schema, RLS, PIN helpers.  Run in Supabase SQL editor (or `supabase db push`).
create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  is_admin boolean not null default false
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null, -- null = shared goal
  title text not null,
  description text,
  category text,
  type text not null check (type in ('checklist','numeric','habit','time')),
  target_value numeric,          -- numeric: amount, habit: number of check-ins, time: hours
  unit text,
  start_date date not null default current_date,
  due_date date,
  status text not null default 'active' check (status in ('active','done','archived')),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.goal_items (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  position int not null default 0
);

-- numeric progress logs and habit check-ins (value = 1)
create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) default auth.uid(),
  value numeric not null,
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) default auth.uid(),
  minutes numeric not null check (minutes > 0),
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index on public.progress_entries (goal_id, entry_date);
create index on public.time_entries (goal_id, entry_date);
create index on public.goal_items (goal_id);

-- private tables: no RLS policies => only the service role (edge functions) can touch them
create table public.app_settings (key text primary key, value text not null);
create table public.login_attempts (
  id bigserial primary key,
  user_name text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
alter table public.login_attempts enable row level security;

-- ---------- RLS: only the two signed-in accounts can read/write ----------
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.goal_items enable row level security;
alter table public.progress_entries enable row level security;
alter table public.time_entries enable row level security;

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

create policy "all goals" on public.goals for all to authenticated using (true) with check (true);
create policy "all items" on public.goal_items for all to authenticated using (true) with check (true);
create policy "all progress" on public.progress_entries for all to authenticated using (true) with check (true);
create policy "all time" on public.time_entries for all to authenticated using (true) with check (true);

-- ---------- profile auto-creation for the two accounts ----------
-- Create users keerthi@tracker.app and tarun@tracker.app in Auth > Users. 'keerthi' becomes admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, is_admin)
  values (new.id, initcap(split_part(new.email, '@', 1)), split_part(new.email, '@', 1) = 'keerthi');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- PIN helpers (service role only) ----------
insert into public.app_settings (key, value)
values ('pin_hash', extensions.crypt('1234', extensions.gen_salt('bf')))   -- initial PIN 1234: change it in Settings!
on conflict (key) do nothing;

create or replace function public.check_pin(p text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from public.app_settings where key = 'pin_hash' and value = crypt(p, value));
$$;

create or replace function public.set_pin(p text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p !~ '^[0-9]{4}$' then raise exception 'PIN must be 4 digits'; end if;
  update public.app_settings set value = crypt(p, gen_salt('bf')) where key = 'pin_hash';
end $$;

revoke all on function public.check_pin(text) from public, anon, authenticated;
revoke all on function public.set_pin(text) from public, anon, authenticated;
grant execute on function public.check_pin(text) to service_role;
grant execute on function public.set_pin(text) to service_role;

-- ---------- realtime ----------
alter publication supabase_realtime add table public.goals, public.goal_items,
  public.progress_entries, public.time_entries, public.profiles;
