const test = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtempSync, rmSync, readFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { resolve, join } = require('node:path')
const root = resolve(__dirname, '..')
const out = mkdtempSync(join(tmpdir(), 'bos-leaderboard-'))
process.on('exit', () => rmSync(out, { recursive: true, force: true }))
const args = ['--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'commonjs', '--outDir', out,
  'lib/dan.ts', 'lib/leaderboard.ts', 'lib/player-settings.ts']
let tsc
try { tsc = require.resolve('typescript/bin/tsc') } catch {}
execFileSync(tsc ? process.execPath : 'tsc', tsc ? [tsc, ...args] : args, { cwd: root, stdio: 'inherit' })
const { buildRateLeaderboard: buildPt, sortLeaderboard, DEFAULT_SORT, SORT_DIRECTIONS, RECENT_GAME_LIMIT } = require(join(out, 'leaderboard.js'))
// Preserve regression checks of the Rate view, now selected explicitly.
const build = (...args) => sortLeaderboard(buildPt(...args), 'rate')
const { parsePlayerSettings: parse, isMissingRankingColumn: missing } = require(join(out, 'player-settings.js'))
const { chronologicalGames } = require(join(out, 'dan.js'))
const player = id => ({ id, name: id.toUpperCase(), ranking_excluded: false })
const players = ['a', 'b', 'c', 'd'].map(player)
const game = (n, scores = [40000, 30000, 20000, 10000], ids = ['a', 'b', 'c', 'd']) => {
  const time = new Date(Date.UTC(2026, 0, 1) + n * 60000).toISOString()
  return { id: `g${String(n).padStart(5, '0')}`, played_at: time, created_at: time,
    game_results: ids.map((id, i) => {
      const higher = scores.filter(s => s > scores[i]).length
      const tied = scores.filter(s => s === scores[i]).length
      const bonus = [50, 10, -10, -30].slice(higher, higher + tied).reduce((a, b) => a + b, 0) / tied
      return { player_id: id, raw_score: scores[i], rank: higher + 1, final_score: Number(((scores[i] - 30000) / 1000 + bonus).toFixed(1)) }
    }) }
}
function snapshots(games, rates = { a: 1610, b: 1520, c: 1490, d: 1380, e: 1300 }) {
  const counts = new Map(), rows = new Map()
  for (const g of chronologicalGames(games)) for (const r of g.game_results) {
    const n = counts.get(r.player_id) ?? 0
    rows.set(`${g.id}:${r.player_id}`, { games_before: n, rating_after: rates[r.player_id] })
    counts.set(r.player_id, n + 1)
  }
  return rows
}
const get = (rows, id = 'a') => rows.find(row => row.id === id)
const series = Array.from({ length: 40 }, (_, i) => game(i, i < 10 ? [10000, 40000, 30000, 20000] : undefined))

test('recent statistic limit is 30, not a lifetime Rate window', () => assert.equal(RECENT_GAME_LIMIT, 30))
test('uses latest lifetime snapshot unchanged after 40 games', () => {
  const rows = build(players, series, snapshots(series, { a: 1901.23, b: 1600, c: 1400, d: 1300 }))
  assert.equal(get(rows).rate, 1901.23)
  assert.equal(get(rows).position, 1)
})
test('30-game statistics discard only own earlier samples', () => {
  const a = get(build(players, series, snapshots(series)))
  assert.equal(a.recentGames, 30); assert.equal(a.avgRank, 1)
  assert.equal(a.firstRate, 1); assert.equal(a.fourthRate, 0)
})
test('fewer than 30 games uses actual denominator', () => {
  const games = [game(0), game(1, [10000, 40000, 30000, 20000])]
  const a = get(build(players, games, snapshots(games)))
  assert.equal(a.recentGames, 2); assert.equal(a.avgRank, 2.5)
  assert.equal(a.firstRate, 0.5); assert.equal(a.fourthRate, 0.5)
})
test('not the clubs last 30 games: inactive player retains own window', () => {
  const games = [...series, ...Array.from({ length: 60 }, (_, i) => game(i + 40, undefined, ['b', 'c', 'd', 'e']))]
  const a = get(build([...players, player('e')], games, snapshots(games)))
  assert.equal(a.recentGames, 30); assert.equal(a.avgRank, 1); assert.equal(a.rate, 1610)
  assert.equal(a.totalGames, 40); assert.equal(a.recentPt, 1800)
})
test('Rate sorting is not replaced by recent average rank sorting', () => {
  const games = [game(0)]
  const rows = build(players, games, snapshots(games, { a: 1300, b: 1400, c: 1500, d: 1800 }))
  assert.equal(rows[0].id, 'd'); assert.equal(rows[0].avgRank, 4)
})
test('opt-out name stays at bottom and no numeric metrics are serialized', () => {
  const opts = players.map(p => ({ ...p, ranking_excluded: p.id === 'a' }))
  const rows = build(opts, series, snapshots(series))
  assert.equal(rows.at(-1).id, 'a'); assert.equal(rows[0].position, 1)
  for (const key of ['position', 'rate', 'recentPt', 'totalGames', 'recentGames', 'avgRank', 'firstRate', 'fourthRate']) assert.equal(rows.at(-1)[key], null)
  assert.equal(rows.at(-1).name, 'A')
})
test('opt-out does not change other players Rate/statistics or the data', () => {
  const ratings = snapshots(series), before = JSON.stringify([...ratings])
  const normal = build(players, series, ratings)
  const hidden = build(players.map(p => ({ ...p, ranking_excluded: p.id === 'a' })), series, ratings)
  for (const id of ['b', 'c', 'd']) {
    for (const key of ['rate', 'recentPt', 'totalGames', 'avgRank']) assert.equal(get(hidden, id)[key], get(normal, id)[key])
  }
  assert.equal(JSON.stringify([...ratings]), before)
})
test('restoring participation restores the original numbers', () => {
  const r = snapshots(series)
  const before = build(players, series, r)
  build(players.map(p => ({ ...p, ranking_excluded: true })), series, r)
  assert.deepEqual(build(players, series, r), before)
})
test('excluded players sort by name, not secretly by Rate', () => {
  const opts = players.map(p => ({ ...p, ranking_excluded: true }))
  const rows = build(opts, series, snapshots(series, { a: 1200, b: 1900, c: 1600, d: 1800 }))
  assert.deepEqual(rows.map(p => p.id), ['a', 'b', 'c', 'd'])
  assert.ok(rows.every(p => p.position === null))
})
test('equal lifetime ratings share competition rank in Rate view', () => {
  const rows = build(players, series, snapshots(series, { a: 1700, b: 1700, c: 1500, d: 1300 }))
  assert.deepEqual(rows.map(p => p.position), [1, 1, 3, 4])
})
test('players with no games are not ranked ahead of rated players', () => {
  const rows = build([...players, player('e')], series, snapshots(series))
  const e = get(rows, 'e')
  assert.equal(e.status, 'no-games'); assert.equal(e.rate, null); assert.equal(e.position, null)
  assert.equal(e.recentGames, 0); assert.equal(e.totalGames, 0)
})
test('missing latest rating is pending, not invented or taken from an older game', () => {
  const ratings = snapshots(series); ratings.delete(`${series.at(-1).id}:a`)
  const a = get(build(players, series, ratings))
  assert.equal(a.status, 'rating-pending'); assert.equal(a.rate, null)
  assert.equal(a.position, null)
})
test('stale lifetime game count is not confused with the recent 30 count', () => {
  const ratings = snapshots(series)
  ratings.set(`${series.at(-1).id}:a`, { games_before: 29, rating_after: 9999 })
  assert.equal(get(build(players, series, ratings)).status, 'rating-pending')
})
test('invalid numeric Rate is never ranked', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    const ratings = snapshots(series)
    ratings.set(`${series.at(-1).id}:a`, { games_before: 39, rating_after: value })
    assert.equal(get(build(players, series, ratings)).rate, null)
  }
})
test('existing competition-rank treatment of score ties remains unchanged', () => {
  const games = [game(0, [35000, 35000, 20000, 10000])]
  const rows = build(players, games, snapshots(games))
  assert.equal(get(rows).avgRank, 1); assert.equal(get(rows, 'b').avgRank, 1)
  assert.equal(get(rows, 'd').fourthRate, 1)
})
test('sorting does not depend on database response order', () => {
  const ratings = snapshots(series)
  assert.deepEqual(buildPt(players, [...series].reverse(), ratings), buildPt(players, series, ratings))
})
test('historical removal updates the window on the next read', () => {
  const games = Array.from({ length: 31 }, (_, i) => game(i, i === 0 ? [10000, 40000, 30000, 20000] : undefined))
  const old = get(buildPt(players, games, snapshots(games)))
  const shortened = games.slice(0, -1)
  const now = get(buildPt(players, shortened, snapshots(shortened)))
  assert.equal(old.avgRank, 1); assert.equal(now.avgRank, 33 / 30)
  assert.equal(old.recentPt, 1800); assert.equal(now.recentPt, 1690)
  assert.equal(old.totalGames, 31); assert.equal(now.totalGames, 30)
})
test('a complete empty history does not invent standings', () => assert.deepEqual(buildPt([], [], new Map()), []))
test('incomplete tables, unknown/duplicate players and invalid ranks stop ranking', () => {
  for (const change of [
    g => g.game_results.pop(),
    g => g.game_results[0].player_id = 'missing',
    g => g.game_results[0].player_id = 'b',
    g => g.game_results[0].rank = 0,
    g => g.game_results[0].raw_score = 1,
  ]) {
    const g = game(0); change(g)
    assert.throws(() => buildPt(players, [g], new Map()), /不完整/)
  }
})
test('input games and player flags are not mutated', () => {
  const before = JSON.stringify([players, series])
  buildPt(players, series, snapshots(series))
  assert.equal(JSON.stringify([players, series]), before)
})
test('settings permit boolean toggles and preserve rename compatibility', () => {
  assert.deepEqual(parse({ ranking_excluded: true, pin: 'not-stored' }), { ranking_excluded: true })
  assert.deepEqual(parse({ ranking_excluded: false }), { ranking_excluded: false })
  assert.deepEqual(parse({ name: ' A ' }), { name: 'A' })
})
test('settings reject string booleans and missing update fields', () => {
  for (const value of ['false', 0, 1, null]) assert.throws(() => parse({ ranking_excluded: value }))
  assert.throws(() => parse({ pin: '1234' })); assert.throws(() => parse({ name: ' ' }))
})
test('settings only forward allow-listed fields', () => {
  assert.deepEqual(parse({ name: 'A', id: 'evil', role: 'admin', pin: 'secret' }), { name: 'A' })
})
test('missing-column compatibility never masks permission or network failures', () => {
  assert.ok(missing({ code: '42703', message: 'column players.ranking_excluded does not exist' }))
  assert.ok(missing({ code: 'PGRST204', message: 'Could not find ranking_excluded column' }))
  assert.equal(missing({ code: '42501', message: 'permission denied: ranking_excluded' }), false)
  assert.equal(missing({ message: 'fetch failed' }), false)
  assert.equal(missing({ code: '42703', message: 'column name does not exist' }), false)
})
test('migration is additive and leaves RLS writes restricted', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/003_ranking_visibility.sql'), 'utf8')
  assert.match(sql, /ADD COLUMN IF NOT EXISTS ranking_excluded boolean NOT NULL DEFAULT false/)
  assert.doesNotMatch(sql, /\b(?:DELETE FROM|TRUNCATE|DROP TABLE|DISABLE ROW LEVEL SECURITY)\b/i)
  assert.doesNotMatch(sql, /GRANT[\s\S]*(?:UPDATE|ALL)[\s\S]*TO (?:anon|authenticated)/i)
})
test('admin endpoint authorizes before update and never calls rate rebuild', () => {
  const api = readFileSync(join(root, 'app/api/players/[id]/route.ts'), 'utf8')
  assert.ok(api.indexOf('input.pin !== expectedPin') < api.indexOf('.update(patch)'))
  assert.match(api, /if \(!expectedPin\)/)
  assert.match(api, /\.eq\('id', id\)/)
  assert.doesNotMatch(api, /recalculateRatings|rating_history|game_results|\.delete\(/)
})

test('default PT view differs from Rate view without changing lifetime Rate', () => {
  const games = [game(0)], ratings = snapshots(games, { a: 1300, b: 1400, c: 1500, d: 1800 })
  const rows = buildPt(players, games, ratings)
  assert.equal(DEFAULT_SORT, 'recentPt'); assert.equal(SORT_DIRECTIONS[DEFAULT_SORT], 'desc')
  assert.equal(rows[0].id, 'a'); assert.equal(rows[0].recentPt, 60); assert.equal(rows[0].rate, 1300)
  assert.equal(sortLeaderboard(rows, 'rate')[0].id, 'd')
})
test('PT totals use last 30, but totalGames is the entire career', () => {
  const a = get(buildPt(players, series, snapshots(series)))
  assert.equal(a.recentPt, 30 * 60); assert.equal(a.totalGames, 40); assert.equal(a.recentGames, 30)
})
test('game 31 drops only game 1 from PT; totalGames still increases', () => {
  const thirty = series.slice(0, 30), thirtyOne = series.slice(0, 31)
  const before = get(buildPt(players, thirty, snapshots(thirty)))
  const after = get(buildPt(players, thirtyOne, snapshots(thirtyOne)))
  assert.equal(after.recentPt, before.recentPt + 60 - (-50))
  assert.equal(after.totalGames, 31)
})
test('fewer than 30 games sums actual PT without prorating', () => {
  const games = [game(0), game(1, [10000, 40000, 30000, 20000])]
  assert.equal(get(buildPt(players, games, snapshots(games))).recentPt, 10)
})
test('PT ties are exact in tenths and do not depend on lifetime Rate', () => {
  const games = [game(0), game(1), game(2)]
  const samples = [[0.1, 0.2, 0.3], [0.3, 0.3, 0], [-1, -2, -3], [-2, -3, -4]]
  games.forEach((g, i) => g.game_results.forEach((row, j) => { row.final_score = String(samples[j][i]) }))
  const rows = buildPt(players, games, snapshots(games))
  assert.equal(get(rows, 'a').recentPt, 0.6); assert.equal(get(rows, 'b').recentPt, 0.6)
  assert.deepEqual(rows.map(row => row.position), [1, 1, 3, 4])
})
test('PT ranking still works while Rate is pending; Rate sort leaves it unranked', () => {
  const games = [game(0)], rows = buildPt(players, games, new Map())
  assert.equal(get(rows).position, 1); assert.equal(get(rows).status, 'rating-pending')
  assert.equal(get(sortLeaderboard(rows, 'rate')).position, null)
})
test('no-games players do not outrank negative PT or gain an invented PT', () => {
  const rows = buildPt([...players, player('e')], series, snapshots(series))
  assert.equal(rows.at(-1).id, 'e'); assert.equal(get(rows, 'e').recentPt, null)
  assert.equal(get(rows, 'e').position, null)
})
test('zero PT with games is a real ranked result', () => {
  const games = [game(0, [25000, 25000, 25000, 25000])]
  const rows = buildPt(players, games, snapshots(games))
  assert.ok(rows.every(row => row.recentPt === 0 && row.position === 1))
})
test('opting out masks total count and PT under every sort and direction', () => {
  const rows = buildPt(players.map(p => ({ ...p, ranking_excluded: p.id === 'a' })), series, snapshots(series))
  for (const key of Object.keys(SORT_DIRECTIONS)) for (const dir of ['asc', 'desc']) {
    const sorted = sortLeaderboard(rows, key, dir)
    assert.equal(sorted.at(-1).id, 'a'); assert.equal(sorted.at(-1).recentPt, null)
    assert.equal(sorted.at(-1).totalGames, null); assert.equal(sorted.at(-1).position, null)
  }
})
test('totalGames sort uses all games, not the capped 30', () => {
  const games = [...series, ...Array.from({ length: 5 }, (_, i) => game(40 + i, undefined, ['b', 'c', 'd', 'e']))]
  const rows = sortLeaderboard(buildPt([...players, player('e')], games, snapshots(games)), 'totalGames')
  assert.equal(rows[0].totalGames, 45); assert.equal(get(rows, 'a').totalGames, 40)
  assert.equal(get(rows, 'a').recentGames, 30); assert.equal(get(rows, 'b').recentGames, 30)
})
test('PT uses stored final_score, not recalculation or Rate deltas', () => {
  const g = game(0); g.game_results[0].final_score = -123.4
  assert.equal(get(buildPt(players, [g], snapshots([g]))).recentPt, -123.4)
})
test('invalid PT values fail closed rather than corrupt the ranking', () => {
  for (const value of [undefined, null, '', ' ', 'bad', NaN, Infinity, 0.123, true]) {
    const g = game(0); g.game_results[0].final_score = value
    assert.throws(() => buildPt(players, [g], new Map()), /PT 数据不完整/)
  }
})
test('sorts do not mutate input order or original positions', () => {
  const rows = buildPt(players, series, snapshots(series)), before = JSON.stringify(rows)
  sortLeaderboard(rows, 'rate', 'asc'); sortLeaderboard(rows, 'recentPt', 'asc')
  assert.equal(JSON.stringify(rows), before)
})
test('editing scores updates PT while preserving game counts', () => {
  const changed = structuredClone(series)
  changed[39].game_results[0].final_score = 1.2
  const a = get(buildPt(players, changed, snapshots(changed)))
  assert.equal(a.recentPt, 29 * 60 + 1.2); assert.equal(a.totalGames, 40)
})
