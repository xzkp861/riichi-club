# Personal profiles and public display

The name-only homepage remains a safe fallback until the ranking visibility migration is installed. The current homepage shows the leaderboard described in `leaderboard.md`: recent-30 PT as the default order, lifetime Rate, lifetime total game count, recent-30 descriptive statistics and administrator-managed opt-outs.

Personal profiles retain Rate, Rate history, rank statistics, head-to-head results and recent games; PT remains hidden on those pages. Dan badges, assessment windows, promotion history and assessment columns are not rendered. The `/dan` route temporarily redirects to the homepage. The dan engine, its tests, DanPanel and original rule documentation remain available for future re-enabling.

`loadClubHistory()` reads the existing full history without running promotions. No match/result/rating resets or deletions are part of this change. History, entry, personal profiles and calculator routes are unchanged. Maintenance is not reintroduced.
