# Personal profiles and public display

The previous name-only homepage is retained as a safe fallback until the ranking visibility migration is installed. The current homepage then shows the Rate leaderboard specified in `leaderboard.md`: lifetime Rate with the player's most recent 30-game descriptive statistics and administrator-managed opt-outs.

Personal profiles retain Rate, Rate history, rank statistics, head-to-head results and recent games; PT remains hidden. Dan badges, assessment windows, promotion history and assessment columns are not rendered. The `/dan` route temporarily redirects to the homepage. The dan engine, its tests, DanPanel and original rule documentation remain available for future re-enabling.

`loadClubHistory()` reads the existing full history without running promotions. No match/result/rating resets or deletions are part of this change. History, entry, personal profiles and calculator routes are unchanged. Maintenance is not reintroduced.
