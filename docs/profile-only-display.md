# Personal-profile display mode

The public homepage is now a searchable player-name directory, not a leaderboard. It has no rank numbers, aggregate statistics or performance sorting. Old sort query parameters are ignored. Personal profiles retain Rate, Rate history, rank statistics, head-to-head results and recent games; PT remains hidden.

Dan badges, assessment windows, promotion history and assessment columns are not rendered. The `/dan` route temporarily redirects to the homepage. The dan engine, its tests, DanPanel and the original rule documentation remain in the repository for a future re-enable.

`loadClubHistory()` loads the existing read-only history without running promotions; `loadClubData()` is retained as a wrapper that adds the original replay. No database migrations, resets, deletes or changes to the scoring and Rate engines are included. History, entry, management and calculator routes are unchanged. Maintenance mode is not reintroduced.

Checks: `node --test tests/profile-presentation.test.cjs` covers the presentation boundaries. Run the production Next.js build as well. These checks do not modify the production database.
