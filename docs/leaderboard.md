# Leaderboard: last-30 PT by default, lifetime total PT, Rate and total games

The homepage shows a leaderboard with optional administrator-managed opt-outs. Dan remains hidden. Both last-30 PT and lifetime total PT are shown on this leaderboard; personal profiles and historical game views remain unchanged.

## Calculation and display

- **Default ranking**: each player's own most recent 30 half-games' stored `final_score` sum, descending. Fewer than 30 games use the actual sum, without padding, scaling or averaging. Sum integer tenths internally so floating-point noise cannot split equal PT totals.
- **Total PT (总 PT)**: sum every historical `final_score` for that player, including games outside the recent-30 window. Accumulate integer tenths separately from the rolling window. This column supports sorting, but does not change the default recent-30 PT ranking. Historical edits/deletions are reflected on the next read; no new stored aggregate is introduced.
- **Rate**: the existing lifetime value in `rating_history`, from the player's latest historical game. Never reset to 1500 at a 30-game boundary, average Rate or recompute Rate from a truncated window. The original calculation and match write/rebuild APIs are unchanged.
- **Total games (总场数)**: all half-games played by that player across the complete history. It is not capped at 30. The old `统计场数` / `N / 30` column is not shown.
- **Recent stats**: average displayed rank, first-place rate and fourth-place rate still use each player's own most recent 30 games, not the club's last 30 games or the last 30 days. Existing competition-rank handling of ties is retained.
- Click a numeric column header to sort by it; click again to reverse direction. Both PT columns and Rate default to descending, average rank and fourth-place rate to ascending. Equal primary values share rank (1, 1, 3); names/IDs only stabilize display ties. Searching never renumbers the full table.
- **No games**: no ranking number or invented PT/Rate. Both PT columns show a dash; total games displays 0. **Missing/stale Rate**: display a pending indicator, not an invented 1500. Valid PT can still be ranked; sorting by Rate leaves missing Rate unranked.
- **Opt-out**: `players.ranking_excluded = true`. Keep the linked name at the bottom, ordered by name under every sort/direction. All other cells, including both PT columns and total games, are grey dashes. The server removes all these metrics from the table props. This is a leaderboard opt-out, not a privacy restriction on public profiles or historical games.
- Opted-out participants remain in every historical match and the shared rating chain. Toggling participation never recalculates ratings or deletes scores. Restoring participation uses the same historical data.
- Personal profiles remain lifetime pages, preserving Rate, charts, head-to-head results and history. Dan remains hidden.

## Database compatibility

This PT/total-games update requires no new migration or environment variables. It reads the existing `final_score` and full history.

## Total PT regression checks

Run `node --test tests/total-pt.test.cjs` and the existing test suites, followed by `npm run build`. The total-PT tests compile the calculation code with strict TypeScript and check full-history sums, the game-31 boundary, unchanged default sorting, decimal ties, zero/negative totals, excluded rows, historical edits/deletion and preservation of Rate/input data. No tests write production data.
