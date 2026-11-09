# Rate leaderboard: lifetime rating + last 30 personal games

This supersedes the homepage-only part of `profile-only-display.md`. PT and dan remain hidden.

## Final agreed meanings

- **Rate** is the existing lifetime rating in `rating_history`. Do not reset it at the start of a 30-game window, take its average, or sum recent changes onto 1500. Each historical update uses the opponents' pre-game ratings. `lib/rating.ts` and the match write/rebuild APIs are unchanged.
- **Rank** is descending lifetime Rate. Exactly equal stored ratings share rank (1, 1, 3). Names/IDs break display ties only. Search does not renumber the global table.
- **Recent stats** (game count, average displayed rank, first/fourth rate) use each player's most recent **30 of their own** half-games, not the club's last 30 games or 30 days. Fewer games use the actual count. Existing competition-rank treatment of ties is retained.
- **No games / stale Rate**: no ranking number. A missing/outdated latest Rate is never replaced with an invented 1500.
- **Opt-out**: `players.ranking_excluded = true`. The name remains linked at the bottom, sorted by name. Every other table cell is a grey dash, not a faded but readable number. The server also removes these metrics from the table props. This is not a privacy restriction on public personal profiles or historical games.
- All historical games including opted-out participants remain in the shared rating chain. The flag never triggers recalculation or deletion. Re-enabling restores the same existing Rate.
- Personal profiles remain lifetime pages and do not lose their charts or history. Dan is still hidden.

## Deployment / database step

Apply `supabase/migrations/003_ranking_visibility.sql` in the existing Supabase project. This adds one boolean to `players`, default false. It is repeatable and has no destructive statements. No new credentials or environment variables are required.

Before this migration is applied, the homepage intentionally keeps the existing name directory, and management disables the participation controls with setup instructions. This avoids pretending a toggle was persisted. Only an explicit missing-column error permits this compatibility path; other database failures stop loading rather than expose opted-out scores.

After migration, refresh `/manage`, enter the existing ADMIN_PIN, and use **隐藏排名** / **恢复参榜**. `PATCH /api/players/[id]` supports strict boolean `ranking_excluded` and the existing rename field. The server fails closed for a missing or incorrect PIN, filters by UUID, validates fields, and returns 404 for a missing player. PIN is never stored on a player row. Existing public SELECT policies are unchanged.

## Validation

Run `node --test tests/leaderboard.test.cjs tests/profile-presentation.test.cjs tests/dan.test.cjs` with dependencies installed, then `npm run build`. Pure tests do not read or write production data. Live Supabase mutation testing requires the migration and the owner's PIN; do not use historical real games as test fixtures.
