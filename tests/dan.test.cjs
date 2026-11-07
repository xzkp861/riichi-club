const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-dan-test-'))
// Compile the pure engine under strict TypeScript before executing actual JS tests.
execFileSync(process.execPath, [require.resolve('typescript/lib/tsc.js'), path.join(__dirname, '../lib/dan.ts'),
  '--outDir', out, '--target', 'ES2020', '--module', 'CommonJS', '--strict', '--skipLibCheck'], { stdio: 'pipe' })
const { DAN_RULES, replayDanHistory, effectiveRanks, chronologicalGames, danProgress } = require(path.join(out, 'dan.js'))
after(() => fs.rmSync(out, { recursive: true, force: true }))
const IDS = ['A', 'B', 'C', 'D']
function game(i, rank = 1, override = {}) {
  let scores
  if (rank === 1.5) scores = [35000, 35000, 20000, 10000]
  else if (rank === 2.5) scores = [25000, 40000, 25000, 10000]
  else if (rank === 3.5) scores = [10000, 45000, 35000, 10000]
  else { const pool = [40000, 30000, 20000, 10000]; const a = pool.splice(rank - 1, 1)[0]; scores = [a, ...pool] }
  const date = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()
  return { id: `game-${String(i).padStart(5, '0')}`, played_at: date, created_at: date,
    game_results: IDS.map((id, n) => ({ player_id: id, raw_score: scores[n] })), ...override }
}
const series = ranks => ranks.map((r, i) => game(i, r))
const state = games => replayDanHistory(games, IDS).get('A')
test('all players begin at first dan, including players without games', () => {
  assert.equal(replayDanHistory([], ['new']).get('new').dan, 1)
  assert.equal(danProgress(replayDanHistory([], ['new']).get('new')).remaining, 8)
})
test('rules match the agreed nine promotion thresholds exactly', () => {
  assert.deepEqual(DAN_RULES.map(r => [r.windowSize, r.averageTenths]), [[8,25],[10,25],[12,24],[12,24],[15,23],[20,23],[20,22],[25,21],[30,20]])
})
test('no early promotion even with seven first places', () => assert.equal(state(series(Array(7).fill(1))).dan, 1))
test('inclusive boundary: 8 games summing 20 promotes', () => {
  const s = state(series([1,2,3,4,1,2,3,4]))
  assert.equal(s.dan, 2); assert.equal(s.promotions[0].rankSum, 20)
  assert.equal(s.gamesSincePromotion, 0); assert.equal(s.window.length, 0)
})
test('failed full window rolls by one, not a full reset', () => {
  const games = series([4,4,4,4,1,1,1,4])
  assert.equal(state(games).dan, 1)
  const s = state([...games, game(8, 1)])
  assert.equal(s.dan, 2)
  assert.deepEqual(s.promotions[0].windowGameIds, Array.from({length:8}, (_,i)=>game(i+1).id))
})
test('promotion scores are not reused and no multiple promotions in one game', () => {
  assert.equal(state(series(Array(17).fill(1))).dan, 2)
  const s = state(series(Array(18).fill(1)))
  assert.equal(s.dan, 3)
  assert.equal(s.promotions[1].windowGameIds[0], game(8).id)
})
test('tie averages for two, three, four players and mixed placements', () => {
  assert.deepEqual(effectiveRanks([35000,35000,20000,10000]), [1.5,1.5,3,4])
  assert.deepEqual(effectiveRanks([88000,4000,4000,4000]), [1,3,3,3])
  assert.deepEqual(effectiveRanks([25000,25000,25000,25000]), [2.5,2.5,2.5,2.5])
  assert.deepEqual(effectiveRanks([40000,40000,10000,10000]), [1.5,1.5,3.5,3.5])
})
test('all-tied games cannot masquerade as four first places', () => {
  const games = Array.from({length:60}, (_,i)=>game(i,1,{game_results:IDS.map(player_id=>({player_id,raw_score:25000}))}))
  for (const s of replayDanHistory(games).values()) assert.equal(s.dan, 3)
})
test('12x2.4 uses exact rank sum, 28.5 passes but 29 fails', () => {
  const prefix = Array(18).fill(1)
  assert.equal(state(series([...prefix, ...Array(9).fill(2.5),2,2,2])).dan, 4)
  const s = state(series([...prefix,...Array(10).fill(2.5),2,2]))
  assert.equal(s.dan, 3)
  assert.equal(danProgress(s).maximumSum, 28.8)
  assert.equal(danProgress(s).attainableSum, 28.5)
})
test('exactly 152 consecutive first places reach ten dan; then cap, no normal demotion', () => {
  const s = state(series(Array(152).fill(1)))
  assert.equal(s.dan, 10); assert.equal(s.promotions.length, 9)
  assert.deepEqual(s.promotions.map(p=>p.gameId), [7,17,29,41,56,76,96,121,151].map(i=>game(i).id))
  const after = state(series([...Array(152).fill(1), ...Array(60).fill(4)]))
  assert.equal(after.dan, 10); assert.equal(after.totalGames, 212)
})
test('losing at a lower dan never triggers normal demotion', () => assert.equal(state(series([...Array(8).fill(1),...Array(80).fill(4)])).dan, 2))
test('input order does not affect replay and inputs are not mutated', () => {
  const games = series(Array(30).fill(1)), original = JSON.stringify(games)
  assert.deepEqual(state([...games].reverse()), state(games))
  assert.equal(JSON.stringify(games), original)
})
test('timestamp, microseconds, creation timestamp and ID fully define order', () => {
  const a = game(0,1,{id:'z',played_at:'2026-01-01T00:00:00.000001+00:00'})
  const b = game(0,1,{id:'a',played_at:'2026-01-01T00:00:00.000002Z'})
  assert.deepEqual(chronologicalGames([b,a]).map(g=>g.id), ['z','a'])
  const c = game(0,1,{id:'z',created_at:'2026-01-01T00:00:00.000001Z'})
  const d = game(0,1,{id:'a',created_at:'2026-01-01T00:00:00.000002Z'})
  assert.deepEqual(chronologicalGames([d,c]).map(g=>g.id), ['z','a'])
  assert.deepEqual(chronologicalGames([game(0,1,{id:'z'}),game(0,1,{id:'a'})]).map(g=>g.id), ['a','z'])
})
test('deleting an old game removes old promotion and shifts the later window', () => {
  const original = series([1,2,3,4,1,2,3,4,...Array(10).fill(1)])
  assert.equal(state(original).dan, 3)
  assert.equal(state(original.filter((_,i)=>i!==0)).dan, 2)
  assert.deepEqual(state(original.filter((_,i)=>i!==0)), state([...original.slice(1)].reverse()))
})
test('editing historical result can revoke a promotion', () => {
  const original = series([1,2,3,4,1,2,3,4])
  const corrected = original.map((g,i)=>i===0?game(0,4):g)
  assert.equal(state(original).dan, 2); assert.equal(state(corrected).dan, 1)
})
test('backdated insert is replayed at original chronology, not insertion order', () => {
  const ranks = [1,2,3,4,1,2,3,4]
  const games = series(ranks)
  assert.deepEqual(state([...games.slice(1),games[0]]), state(games))
})
test('player swaps only count games actually played', () => {
  const games = series(Array(8).fill(1))
  games[3] = {...games[3],game_results:games[3].game_results.map(r=>r.player_id==='A'?{...r,player_id:'E'}:r)}
  const map = replayDanHistory(games, [...IDS,'E'])
  assert.equal(map.get('A').dan,1); assert.equal(map.get('A').totalGames,7)
  assert.equal(map.get('E').totalGames,1)
})
test('invalid or duplicate records never silently award rank', () => {
  for (const games of [[game(0),game(0)], [game(0,1,{game_results:[]})], [game(0,1,{played_at:'bad'})],
    [game(0,1,{game_results:IDS.map(player_id=>({player_id,raw_score:10000}))})],
    [game(0,1,{game_results:IDS.map(()=>({player_id:'A',raw_score:25000}))})]]) assert.throws(()=>state(games))
})
test('more than 1000 games are all replayed by the pure engine', () => assert.equal(state(series(Array(1300).fill(4))).totalGames,1300))
test('promotion history audit windows satisfy all rules and never overlap', () => {
  let seed=17
  const ranks=Array.from({length:5000},()=>{seed=(seed*1664525+1013904223)>>>0;return 1+(seed%4)})
  const s=state(series(ranks)), used = new Set()
  for (const p of s.promotions) {
    const rule=DAN_RULES.find(r=>r.from===p.from)
    assert.equal(p.windowGameIds.length,rule.windowSize)
    assert.ok(p.rankSum*10<=rule.windowSize*rule.averageTenths)
    for(const id of p.windowGameIds){assert.ok(!used.has(id));used.add(id)}
  }
})
