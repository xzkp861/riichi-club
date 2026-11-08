const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const read = path => readFileSync(resolve(__dirname, '..', path), 'utf8')
const home = read('app/page.tsx')
const directory = read('components/PlayerDirectory.tsx')
const profile = read('app/players/[id]/page.tsx')
const loader = read('lib/club-data.ts')

test('home is a player directory, not a sortable leaderboard', () => {
  assert.match(home, /PlayerDirectory players=\{players\}/)
  assert.doesNotMatch(home, /searchParams|SortKey|<table|GameCard|loadClubData|段位|排行榜|PT/)
  assert.match(home, /\.order\('name'\)\.order\('id'\)/)
})

test('directory lists names and profile links without ratings or ranking numbers', () => {
  assert.match(directory, /href=\{`\/players\/\$\{player.id\}`\}/)
  assert.match(directory, /type="search"/)
  assert.doesNotMatch(directory, /Rate|PT|rank|dan|index|<table/)
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
  for (const source of [loader, home, profile, directory]) {
    assert.doesNotMatch(source, /\.(?:insert|update|delete|upsert)\s*\(/)
  }
})
