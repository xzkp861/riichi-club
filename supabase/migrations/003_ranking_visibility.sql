-- Additive only: no player/game/result/rating rows are removed or recomputed.
-- Existing and future players participate by default; admins can opt them out.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ranking_excluded boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.players.ranking_excluded IS
  'Display-only opt-out from the public leaderboard; does not affect game or rating calculations.';

-- Keep the existing SELECT-only RLS policies for anon/authenticated.
-- Writes use the server service client only AFTER ADMIN_PIN authorization.
NOTIFY pgrst, 'reload schema';
