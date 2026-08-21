-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "uuid-ossp";

-- Projects: one row per generated app
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prompt text not null,
  status text not null default 'draft', -- draft | generating | ready | pushed | failed
  github_repo_url text,
  zip_path text, -- path in Supabase Storage bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat messages tied to a project
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Per-user credit balance (LLM calls + builds cost credits)
create table if not exists public.credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remaining int not null default 20,
  reset_at timestamptz not null default (now() + interval '30 days')
);

-- Auto-create a credits row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.credits (user_id, remaining, reset_at)
  values (new.id, 20, now() + interval '30 days');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security: users can only touch their own rows
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.credits enable row level security;

create policy "Users manage their own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage messages on their own projects"
  on public.messages for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
      and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users view their own credits"
  on public.credits for select
  using (auth.uid() = user_id);
