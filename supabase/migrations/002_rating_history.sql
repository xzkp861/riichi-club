create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rating_before numeric(10,2) not null,
  rating_change numeric(10,2) not null,
  rating_after numeric(10,2) not null,
  games_before integer not null default 0,
  created_at timestamptz not null default now(),
  unique(game_id, player_id)
);

create index if not exists rating_history_player_id_idx
  on public.rating_history(player_id);

create index if not exists rating_history_game_id_idx
  on public.rating_history(game_id);

alter table public.rating_history enable row level security;

drop policy if exists "public read rating history" on public.rating_history;
create policy "public read rating history"
  on public.rating_history
  for select
  using (true);

grant select on public.rating_history to anon, authenticated;
