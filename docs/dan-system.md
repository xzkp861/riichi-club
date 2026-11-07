# BOS rolling-window dan system (bos-dan-v1)

All players start at 初段, even with no games. No kyu ranks or automatic normal demotion.

| From | To | Window N | Maximum average |
| --- | --- | ---: | ---: |
| 初段 | 二段 | 8 | 2.50 |
| 二段 | 三段 | 10 | 2.50 |
| 三段 | 四段 | 12 | 2.40 |
| 四段 | 五段 | 12 | 2.40 |
| 五段 | 六段 | 15 | 2.30 |
| 六段 | 七段 | 20 | 2.30 |
| 七段 | 八段 | 20 | 2.20 |
| 八段 | 九段 | 25 | 2.10 |
| 九段 | 十段 | 30 | 2.00 |

## Source of truth and corrections

- `lib/dan.ts` is a pure, deterministic replay. It writes nothing to the database.
- Existing historical games are included. No season reset or destructive migration.
- Sort by `played_at`, then `created_at`, then game UUID ascending. Microseconds are preserved.
- Each player's window contains only games played AFTER their latest promotion. The promotion game is consumed by the previous stage.
- Check only after N games, inclusive threshold; thereafter roll one game at a time. On passing, advance exactly one dan and clear that player's window.
- Ten dan is the cap. Subsequent games still contribute to PT/Rate and other statistics.
- Editing, deleting, swapping participants, or backdating a game changes the next read's full replay. Erroneous promotions may disappear; this is correction, not normal demotion.
- No separate `dan_history` cache/table: current rank, active window and promotion audit history are derived together. No SQL or environment changes required.

## Ties and precision

Use final point totals to derive average occupied rank: 1/2 tie -> 1.5; 2/3/4 tie -> 3; four-way tie -> 2.5. Displayed competition ranks and pre-existing PT/Rate formulas remain unchanged. UI labels assessment rank separately from the original displayed rank.

Compare `sum * 10 <= N * thresholdTenths`, without rounding averages. E.g. 12 x 2.4 = 28.8, so the largest achievable passing half-integer sum is 28.5. Incomplete windows show provisional averages and cannot pass early.

## Pages and data access

- `/`: defaults to dan descending, then existing Rate, PT, UUID. A progress link opens the player's assessment. Existing sort options remain. No-game players are included.
- `/players/[id]`: current dan, progress, inspectable window, promotion history, assessment ranks in recent games. PT, Rate, charts and head-to-head retained.
- `/dan`: explains the club's custom rules and thresholds; not an external official certification.
- `lib/club-data.ts`: counted pagination reads all players, games and rating records instead of accepting a truncated first page. Requests are dynamic/uncached at the page level.
- Invalid games (missing/duplicate participants, invalid scores or timestamps) stop replay. The UI does not invent initial ranks or silently drop corrupt games.
- This is request-time replay, not a materialized transaction snapshot. Count changes during pagination are detected, but same-count concurrent edits may require a refresh. At larger scale, use a database snapshot/RPC before adding caching.
- Existing Rate rebuild APIs and their stored history have not been redesigned by this change.

## Test and release

After installing the project's dependencies:

```sh
node --test tests/dan.test.cjs
npm run build
```

Tests compile the pure engine with strict TypeScript, then execute it. They do not connect to Supabase or alter production data. Cover initial rank, all agreed rules, minimum windows, ties, rolling failure, stage resets, exact thresholds, the 152-game theoretical minimum, ten-dan cap, historical corrections, deterministic ordering and large histories.

This feature is developed on `dev`. Do not remove or overwrite production's `proxy.ts` maintenance mode when merging later. Do not force-push `dev` over `main`; preserve production changes. Testing against a shared production database must be read-only, or use a separate test project for destructive cases.
