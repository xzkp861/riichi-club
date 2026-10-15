# Architecture and implementation notes

This project is a lightweight, club-sized application. It favors a straightforward Next.js + Supabase setup over a more complex service architecture.

## Main parts of the code

| Location | Responsibility |
| --- | --- |
| `app/page.tsx` | Leaderboard and recent match results |
| `app/games/` | Match history and editing UI |
| `app/add-game/` | Game entry and player creation UI |
| `app/players/[id]/` | Player statistics, trends and head-to-head comparisons |
| `app/calculator/` | Han/fu payment calculator and reference tables |
| `app/manage/` | Rename existing players |
| `app/api/` | Server endpoints for players, matches, and rating recalculation |
| `lib/scoring.ts` | Match placements and PT calculation |
| `lib/rating.ts` | Chronological club rating recalculation |
| `lib/supabase/` | Public and privileged database clients |
| `supabase/migrations/` | Database tables, constraints, RLS, and read policies |

## Data model

The SQL migrations define four main tables:

- **`players`:** one row per player; unique name and UUID identifier.
- **`games`:** game identifier and timestamps.
- **`game_results`:** one row per player per game, with seat, raw score, placement, and final PT. Foreign keys connect games and players; uniqueness constraints prevent duplicate players, seats, and placements within a game.
- **`rating_history`:** each player's rating before and after a game, plus the rating change and number of prior games.

The `leaderboard` view provides aggregate statistics in SQL. The current home page also computes its displayed leaderboard by reading results and rating history.

## Data flow

### Recording a match

1. The game entry page checks the running total and submits the selected player IDs, scores and admin PIN.
2. `POST /api/games` checks the PIN and validates four distinct players.
3. `calculateFinalScores` validates integer scores totaling 100,000, then calculates placements and PT.
4. The API writes a game and four associated game results.
5. `recalculateRatings` rebuilds rating history from recorded matches.

Editing and deleting a match also trigger full rating recalculation. This keeps derived ratings based on the recorded match history, although a full rebuild will become expensive for much larger datasets.

### Viewing results

Next.js server-rendered pages use the public Supabase client to read match records and rating history. Some API read endpoints use the server-side client. The database enables row-level security with public select policies for the four tables. Mutations run through server API routes and require a shared admin PIN.

**Security scope:** the PIN is a simple club administration mechanism, not a replacement for user authentication and authorization in a public commercial product. The Supabase secret key must stay on the server.

## Rating calculation

`lib/rating.ts` initializes each player at **1500** and processes recorded games in chronological order. It combines placement-based values with an adjustment based on the player's rating relative to the table, with a coefficient that changes with the number of previously played games. Each result is saved in `rating_history`. It is a custom club formula, not an official rating algorithm.

## Trade-offs and improvements

- **Tied final scores:** the scoring helper contains tie-handling logic, but the `game_results` table has a unique rank constraint, so tied placements are not supported end-to-end.
- **Atomic updates:** match updates are made through separate database operations, with an attempt to restore old results if insertion fails. A database transaction or RPC would provide more reliable consistency.
- **Recalculation cost:** ratings are recomputed for all games after mutations. Incremental updates could help if the history grows.
- **Access control:** shared PINs work for a small trusted group; individual accounts, roles and stronger abuse protection would be necessary for a broader audience.
- **Testing:** automated score, API, and integration tests would make future changes safer.
- **Hand-scoring tool:** it displays common han/fu point payments and quick reference tables; it does not account for honba or riichi-stick adjustments.

These limitations are documented to distinguish the current working club tool from features that would need more engineering before broader deployment.
