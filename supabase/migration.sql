-- Run this in the Supabase SQL Editor once, after creating the project.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles owner select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles owner insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table public.profit_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry numeric not null,
  sell numeric not null,
  money numeric not null,
  profit_usd numeric not null,
  profit_percent numeric not null,
  created_at timestamptz not null default now()
);
create index profit_entries_user_id_idx on public.profit_entries(user_id);
alter table public.profit_entries enable row level security;
create policy "profit entries owner rw" on public.profit_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.user_price_marks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_price numeric,
  entry_price numeric,
  updated_at timestamptz not null default now()
);
alter table public.user_price_marks enable row level security;
create policy "price marks owner rw" on public.user_price_marks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.command_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cal','profit','goal','cleargoal','entry','clearentry')),
  command text not null,
  profit_percent numeric,
  profit_usd numeric,
  created_at timestamptz not null default now()
);
create index command_history_user_id_created_idx on public.command_history(user_id, created_at desc);
alter table public.command_history enable row level security;
create policy "command history owner rw" on public.command_history for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
