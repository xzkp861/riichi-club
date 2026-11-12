const test = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtempSync, rmSync, readFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { resolve, join } = require('node:path')
const root = resolve(__dirname, '..')
const out = mkdtempSync(join(tmpdir(), 'bos-total-pt-'))
process.on('exit', () => rmSync(out, { recursive: true, force: true }))
const args = ['--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'commonjs', '--outDir', out, 'lib/dan.ts', 'lib/leaderboard.ts']
let tsc
try { tsc = require.resolve('typescript/bin/tsc') } catch {}
execFileSync(tsc ? process.execPath : 'tsc', tsc ? [tsc, ...args] : args, { cwd: root, stdio: 'inherit' })
const { buildRateLeaderboard: build, sortLeaderboard: sort, DEFAULT_SORT } = require(join(out, 'leaderboard.js'))
const player = id => ({ id, name: id.toUpperCase(), ranking_excluded: false })
const players = ['a', 'b', 'c', 'd'].map(player)
function game(n, scores = [40000, 30000, 20000, 10000]) {
  const time = new Date(Date.UTC(2026, 0, 1) + n * 60000).toISOString()
  return { id: `g${n}`, played_at: time, created_at: time, game_results: players.map((p, i) => ({
    player_id: p.id, raw_score: scores[i], rank: 1 + scores.filter(s => s > scores[i]).length,
    final_score: (scores[i] - 30000) / 1000 + [50, 10, -10, -30][scores.filter(s => s > scores[i]).length],
  })) }
}
function ratings(games) {
  const rows = new Map()
  games.forEach((g, n) => g.game_results.forEach(r => rows.set(`${g.id}:${r.player_id}`, { games_before: n, rating_after: 1700 + n })))
  return rows
}
const get = (rows, id = 'a') => rows.find(r => r.id === id)
const games = Array.from({ length: 40 }, (_, i) => game(i, i < 10 ? [10000, 40000, 30000, 20000] : undefined))

test('total PT includes games outside the recent 30; total games and Rate remain lifetime', () => {
  const a = get(build(players, games, ratings(games)))
  assert.equal(a.totalPt, -50 * 10 + 60 * 30)
  assert.equal(a.recentPt, 60 * 30)
  assert.equal(a.totalGames, 40)
  assert.equal(a.recentGames, 30)
  assert.equal(a.rate, 1739)
})
test('game 31 adds to total PT without dropping game 1 from total PT', () => {
  const before = get(build(players, games.slice(0, 30), new Map()))
  const after = get(build(players, games.slice(0, 31), new Map()))
  assert.equal(after.totalPt, before.totalPt + 60)
  assert.equal(after.recentPt, before.recentPt + 60 + 50)
})
test('default remains recent PT while total PT can be sorted both directions', () => {
  const career = Array.from({ length: 130 }, (_, i) => game(i, i >= 100 ? [10000, 40000, 30000, 20000] : undefined))
  const rows = build(players, career, ratings(career))
  assert.equal(DEFAULT_SORT, 'recentPt')
  assert.equal(rows[0].id, 'b')
  assert.equal(sort(rows, 'totalPt')[0].id, 'a')
  assert.equal(sort(rows, 'totalPt', 'asc')[0].id, 'd')
})
test('short careers use actual sum; empty careers remain unranked', () => {
  const rows = build([...players, player('e')], games.slice(0, 2), new Map())
  assert.equal(get(rows).totalPt, -100)
  assert.equal(get(rows).totalPt, get(rows).recentPt)
  assert.equal(get(rows, 'e').totalPt, null)
  assert.equal(get(sort(rows, 'totalPt'), 'e').position, null)
})
test('decimal strings sum in integer tenths and exactly equal totals share rank', () => {
  const samples = [game(0), game(1)]
  samples[0].game_results.forEach((r, i) => { r.final_score = ['0.1', '0.3', '-0.2', '-0.2'][i] })
  samples[1].game_results.forEach((r, i) => { r.final_score = ['0.2', '0.0', '-0.1', '-0.1'][i] })
  const rows = sort(build(players, samples, new Map()), 'totalPt')
  assert.equal(get(rows).totalPt, 0.3)
  assert.equal(get(rows, 'b').totalPt, 0.3)
  assert.deepEqual(rows.map(r => r.position), [1, 1, 3, 3])
})
test('a real zero PT is ranked and is not confused with no history', () => {
  const sample = game(0)
  sample.game_results[0].final_score = 0
  const rows = build(players, [sample], new Map())
  assert.equal(get(rows).totalPt, 0)
  assert.notEqual(get(sort(rows, 'totalPt')).position, null)
})
test('opt-out redacts total PT and remains last for every sort/direction', () => {
  const opts = players.map(p => ({ ...p, ranking_excluded: p.id === 'a' }))
  const rows = build(opts, games, ratings(games))
  assert.equal(get(rows).totalPt, null)
  for (const key of ['recentPt', 'totalPt', 'rate', 'totalGames', 'avgRank', 'firstRate', 'fourthRate']) {
    for (const dir of ['asc', 'desc']) {
      const ordered = sort(rows, key, dir)
      assert.equal(ordered.at(-1).id, 'a')
      assert.equal(ordered.at(-1).position, null)
    }
  }
})
test('hiding and restoring does not mutate ratings, scores or other players totals', () => {
  const r = ratings(games), snapshot = JSON.stringify([players, games, [...r]])
  const normal = build(players, games, r)
  const hidden = build(players.map(p => ({ ...p, ranking_excluded: p.id === 'a' })), games, r)
  for (const id of ['b', 'c', 'd']) assert.equal(get(hidden, id).totalPt, get(normal, id).totalPt)
  assert.deepEqual(build(players, games, r), normal)
  assert.equal(JSON.stringify([players, games, [...r]]), snapshot)
})
test('editing or deleting an old game updates total PT while preserving an unaffected recent window', () => {
  const before = get(build(players, games, new Map()))
  const edited = structuredClone(games)
  edited[0].game_results[0].final_score = -49.9
  assert.equal(get(build(players, edited, new Map())).totalPt, 1300.1)
  const deleted = get(build(players, games.slice(1), new Map()))
  assert.equal(deleted.totalPt, before.totalPt + 50)
  assert.equal(deleted.recentPt, before.recentPt)
})
test('total PT uses the full player history regardless of input order', () => {
  assert.deepEqual(build(players, [...games].reverse(), ratings(games)), build(players, games, ratings(games)))
})
test('total PT has a sortable column and is never rendered in opt-out cells', () => {
  const board = readFileSync(join(root, 'components/RateLeaderboard.tsx'), 'utf8')
  assert.match(board, /heading\('总 PT', 'totalPt'\)/)
  assert.match(board, /pt\(row.totalPt\)/)
  const excluded = board.split('row.excluded ? (')[1].split(') : (')[0]
  assert.doesNotMatch(excluded, /row\.totalPt/)
  assert.match(excluded, /\[0, 1, 2, 3, 4, 5, 6\]/)
})
