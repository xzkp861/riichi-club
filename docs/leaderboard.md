# Leaderboard: last-30 PT by default, lifetime Rate and total games

The homepage shows a leaderboard with optional administrator-managed opt-outs. Dan remains hidden. PT is shown only as a last-30 total on this leaderboard; personal profiles and historical game views remain unchanged.

## Calculation and display

- **Default ranking**: each player's own most recent 30 half-games' stored `final_score` sum, descending. Fewer than 30 games use the actual sum, without padding, scaling or averaging. Sum integer tenths internally so floating-point noise cannot split equal PT totals.
- **Rate**: the existing lifetime value in `rating_history`, from the player's latest historical game. Never reset to 1500 at a 30-game boundary, average Rate or recompute Rate from a truncated window. The original calculation and match write/rebuild APIs are unchanged.
- **Total games (总场数)**: all half-games played by that player across the complete history. It is not capped at 30. The old `统计场数` / `N / 30` column is not shown.
- **Recent stats**: average displayed rank, first-place rate and fourth-place rate still use each player's own most recent 30 games, not the club's last 30 games or the last 30 days. Existing competition-rank handling of ties is retained.
- Click a numeric column header to sort by it; click again to reverse direction. PT and Rate default to descending, average rank and fourth-place rate to ascending. Equal primary values share rank (1, 1, 3); names/IDs only stabilize display ties. Searching never renumbers the full table.
- **No games**: no ranking number or invented PT/Rate. Total games displays 0. **Missing/stale Rate**: display a pending indicator, not an invented 1500. Valid PT can still be ranked; sorting by Rate leaves missing Rate unranked.
- **Opt-out**: `players.ranking_excluded = true`. Keep the linked name at the bottom, ordered by name under every sort/direction. All other cells, including PT and total games, are grey dashes. The server removes all these metrics from the table props. This is a leaderboard opt-out, not a privacy restriction on public profiles or historical games.
- Opted-out participants remain in every historical match and the shared rating chain. Toggling participation never recalculates ratings or deletes scores. Restoring participation uses the same historical data.
- Personal profiles remain lifetime pages, preserving Rate, charts, head-to-head results and history. Dan remains hidden.

## Database compatibility

This PT/total-games update requires no new migration or environment variables. It reads the existing `final_score` and full history.

The preceding opt-out feature requires `supabase/migrations/003_ranking_visibility.sql` (an additive boolean on `players`, default false). Until applied, keep the safe name-directory fallback and disable participation controls. Only an explicit missing-column error permits fallback; other failures must not reveal opted-out metrics.

Management retains the existing ADMIN_PIN checks and **隐藏排名** / **恢复参榜** controls. No authentication or permission changes are part of this update.

## Validation

```sh
node --test tests/leaderboard.test.cjs tests/profile-presentation.test.cjs tests/dan.test.cjs
npm run build
```

The tests do not read or mutate the production database. Cover default PT sorting, lifetime Rate isolation, 30/31-game rollover, total counts beyond 30, decimal ties, negative/zero PT, missing ratings, search-stable positions, opt-out masking, history edits/deletion and input immutability.
