create extension if not exists pgcrypto;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  seat smallint not null check (seat between 1 and 4),
  raw_score integer not null,
  rank smallint not null check (rank between 1 and 4),
  final_score numeric(8,1) not null,
  created_at timestamptz not null default now(),
  unique(game_id, player_id),
  unique(game_id, seat),
  unique(game_id, rank)
);

alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.game_results enable row level security;

create policy "public read players" on public.players for select using (true);
create policy "public read games" on public.games for select using (true);
create policy "public read results" on public.game_results for select using (true);

create or replace view public.leaderboard as
select
  p.id as player_id,
  p.name,
  count(gr.id)::int as games,
  coalesce(avg(gr.rank),0)::numeric(4,2) as avg_rank,
  coalesce(avg(case when gr.rank = 1 then 1.0 else 0.0 end),0)::numeric(6,4) as first_rate,
  coalesce(avg(case when gr.rank = 4 then 1.0 else 0.0 end),0)::numeric(6,4) as fourth_rate,
  coalesce(avg(gr.final_score),0)::numeric(8,2) as avg_final_score,
  coalesce(sum(gr.final_score),0)::numeric(10,1) as total_final_score
from public.players p
left join public.game_results gr on gr.player_id = p.id
group by p.id, p.name;

grant select on public.leaderboard to anon, authenticated;
grant select on public.players, public.games, public.game_results to anon, authenticated;
