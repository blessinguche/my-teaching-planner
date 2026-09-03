-- QTS Planner — account-linked data
-- Paste into Supabase → SQL Editor → Run (once).
-- Captures / recordings stay on the device and are NOT stored here.

create table if not exists public.planner_account (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner_account enable row level security;

drop policy if exists "planner_account_own" on public.planner_account;
create policy "planner_account_own"
  on public.planner_account
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.planner_account to authenticated;
