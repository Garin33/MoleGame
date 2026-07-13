-- 在 Supabase Dashboard > SQL Editor 中执行一次。
-- 同时在 Authentication > Providers 中启用 Anonymous Sign-Ins。

create table if not exists public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 12),
  level integer not null default 1 check (level >= 1),
  depth integer not null default 1 check (depth >= 1),
  total_digs integer not null default 0 check (total_digs >= 0),
  score bigint generated always as ((level::bigint * 1000000) + (depth::bigint * 100) + total_digs) stored,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

drop policy if exists "Anyone can read leaderboard" on public.leaderboard;
create policy "Anyone can read leaderboard"
on public.leaderboard for select
to anon, authenticated
using (true);

drop policy if exists "Players can create own score" on public.leaderboard;
create policy "Players can create own score"
on public.leaderboard for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Players can update own score" on public.leaderboard;
create policy "Players can update own score"
on public.leaderboard for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists leaderboard_score_idx
on public.leaderboard (score desc);
