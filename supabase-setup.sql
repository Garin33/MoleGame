-- 在 Supabase Dashboard > SQL Editor 中执行一次。
-- 同时在 Authentication > Settings 中启用 Anonymous Sign-Ins。

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

-- 昵称升级：旧数据若有重名，先给较晚记录增加短后缀，再建立不区分大小写的唯一索引。
with ranked_names as (
  select
    user_id,
    player_name,
    row_number() over (
      partition by lower(player_name)
      order by updated_at asc, user_id
    ) as duplicate_number
  from public.leaderboard
)
update public.leaderboard as scores
set player_name = left(ranked_names.player_name, 8) || '_' || left(scores.user_id::text, 3)
from ranked_names
where scores.user_id = ranked_names.user_id
  and ranked_names.duplicate_number > 1;

alter table public.leaderboard
drop constraint if exists leaderboard_player_name_check;

alter table public.leaderboard
add constraint leaderboard_player_name_check
check (char_length(trim(player_name)) between 2 and 12);

create unique index if not exists leaderboard_player_name_unique_ci
on public.leaderboard (lower(trim(player_name)));
