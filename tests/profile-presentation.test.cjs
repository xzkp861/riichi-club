const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const read = path => readFileSync(resolve(__dirname, '..', path), 'utf8')
const home = read('app/page.tsx')
const directory = read('components/PlayerDirectory.tsx')
const board = read('components/RateLeaderboard.tsx')
const profile = read('app/players/[id]/page.tsx')
const loader = read('lib/club-data.ts')

test('home defaults to recent PT, retains lifetime Rate and hides dan', () => {
  assert.match(home, /RateLeaderboard rows=\{rows\}/)
  assert.match(home, /buildRateLeaderboard\(preferences.players, club.games, club.ratingByGamePlayer\)/)
  assert.match(home, /默认按近30场 PT 总和/)
  assert.match(home, /生涯 Rate/)
  assert.match(home, /最近 30 个半庄/)
  assert.match(home, /总场数为全部历史半庄数/)
  assert.match(home, /!preferences.rankingSettingsReady/)
  assert.doesNotMatch(home, /searchParams|GameCard|loadClubData|段位/)
})

test('name directory remains available during migration without revealing metrics', () => {
  assert.match(directory, /href=\{`\/players\/\$\{player.id\}`\}/)
  assert.match(directory, /type="search"/)
  assert.doesNotMatch(directory, /Rate|PT|rank|dan|index|<table/)
})

test('opt-out rows have linked names and grey placeholders, not faded metrics', () => {
  const excluded = board.split('row.excluded ? (')[1].split(') : (')[0]
  assert.match(excluded, /row.name/)
  assert.match(excluded, /mutedCell/)
  assert.match(excluded, /不参榜，不展示数据/)
  assert.doesNotMatch(excluded, /row\.(rate|position|recentPt|totalGames|avgRank|firstRate|fourthRate|recentGames)/)
})

test('board shows total games instead of the capped sample count', () => {
  assert.match(board, /heading\('总场数', 'totalGames'\)/)
  assert.match(board, /<td>\{row.totalGames\}<\/td>/)
  assert.doesNotMatch(board, /统计场数|row.recentGames|\/ 30/)
  assert.match(board, /heading\('近30场 PT', 'recentPt'\)/)
  assert.match(board, /heading\('Rate（生涯）', 'rate'\)/)
})

test('board sorts the complete list before search and exposes accessible sortable headers', () => {
  assert.ok(board.indexOf('sortLeaderboard(rows, sort, direction)') < board.indexOf('ordered.filter'))
  assert.match(board, /useState<LeaderboardSortKey>\(DEFAULT_SORT\)/)
  assert.match(board, /aria-sort=/)
  assert.match(board, /onClick=\{\(\) => changeSort\(key\)\}/)
})

test('profile hides dan, promotion and assessment UI', () => {
  assert.doesNotMatch(profile, /DanPanel|danLabel|assessmentRank|promotions|段位|晋级|考核|升段|排行榜|\bPT\b/)
  assert.match(profile, /返回玩家列表/)
})

test('profile retains Rate, rank charts, recent history and half-win ties', () => {
  for (const label of ['当前 Rate', '历史最高 Rate', 'Rate 曲线', '顺位曲线', '顺位分布', '最近 10 场', 'VS 其他玩家', 'Rate变化']) {
    assert.ok(profile.includes(label), label)
  }
  assert.match(profile, /me\.result\.raw_score === opponent\.raw_score \? 0\.5/)
})

test('old dan URL temporarily redirects without rendering rules', () => {
  const route = read('app/dan/page.tsx')
  assert.match(route, /redirect\('\/'\)/)
  assert.doesNotMatch(route, /permanentRedirect|<main|DAN_RULES/)
})

test('personal history loading is independent of dan replay', () => {
  assert.match(profile, /await loadClubHistory\(\)/)
  assert.doesNotMatch(profile, /loadClubData/)
  const historyBody = loader.split('export async function loadClubHistory()')[1].split('export async function loadClubData()')[0]
  assert.doesNotMatch(historyBody, /replayDanHistory\(/)
  assert.match(loader, /export async function loadClubData\(\)/)
  assert.match(loader, /replayDanHistory\(club.games/)
})

test('read path preserves score fields and never writes to the database', () => {
  assert.match(loader, /final_score/)
  assert.match(loader, /rating_history/)
  for (const source of [loader, home, profile, directory, board]) {
    assert.doesNotMatch(source, /\.(?:insert|update|delete|upsert)\s*\(/)
  }
})
