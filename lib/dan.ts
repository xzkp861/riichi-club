/** BOS club rules, not an official certification. Pure replay: never writes to the DB. */
export const DAN_RULE_VERSION = 'bos-dan-v1'
export const DAN_LABELS = ['初段', '二段', '三段', '四段', '五段', '六段', '七段', '八段', '九段', '十段'] as const
export type DanRule = { from: number; to: number; windowSize: number; averageTenths: number }
export const DAN_RULES: readonly DanRule[] = [
  { from: 1, to: 2, windowSize: 8, averageTenths: 25 },
  { from: 2, to: 3, windowSize: 10, averageTenths: 25 },
  { from: 3, to: 4, windowSize: 12, averageTenths: 24 },
  { from: 4, to: 5, windowSize: 12, averageTenths: 24 },
  { from: 5, to: 6, windowSize: 15, averageTenths: 23 },
  { from: 6, to: 7, windowSize: 20, averageTenths: 23 },
  { from: 7, to: 8, windowSize: 20, averageTenths: 22 },
  { from: 8, to: 9, windowSize: 25, averageTenths: 21 },
  { from: 9, to: 10, windowSize: 30, averageTenths: 20 },
]
export type DanGame = {
  id: string
  played_at: string
  created_at: string
  game_results: readonly { player_id: string; raw_score: number }[]
}
export type DanSample = { gameId: string; playedAt: string; rank: number }
export type DanPromotion = {
  gameId: string; playedAt: string; from: number; to: number
  rankSum: number; average: number; windowGameIds: string[]
}
export type DanState = {
  dan: number; totalGames: number; gamesSincePromotion: number
  window: DanSample[]; promotions: DanPromotion[]
}
export class DanDataError extends Error {}
export function danLabel(dan: number) { return DAN_LABELS[dan - 1] ?? '未知段位' }
export function initialDanState(): DanState {
  return { dan: 1, totalGames: 0, gamesSincePromotion: 0, window: [], promotions: [] }
}
export function nextDanRule(dan: number) { return DAN_RULES.find(rule => rule.from === dan) }
export function effectiveRanks(scores: readonly number[]): number[] {
  if (scores.length !== 4 || scores.some(score => !Number.isSafeInteger(score)) ||
      scores.reduce((sum, score) => sum + score, 0) !== 100000) {
    throw new DanDataError('四家点数必须为整数且合计 100000')
  }
  return scores.map(score => {
    const higher = scores.filter(other => other > score).length
    const tied = scores.filter(other => other === score).length
    return higher + 1 + (tied - 1) / 2
  })
}
// Preserve PostgreSQL microseconds; Date alone loses sub-millisecond ordering.
function timestampKey(value: string): bigint {
  const ms = Date.parse(value)
  if (!Number.isFinite(ms) || !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    throw new DanDataError('对局时间缺失或格式不正确')
  }
  const fraction = /\.(\d+)/.exec(value)?.[1] ?? ''
  return BigInt(ms) * BigInt(1000) + BigInt(fraction.padEnd(6, '0').slice(3, 6))
}
export function chronologicalGames<T extends DanGame>(games: readonly T[]): T[] {
  const seen = new Set<string>()
  const keyed = games.map(game => {
    if (!game.id || seen.has(game.id)) throw new DanDataError('发现重复或缺失的对局 ID，请刷新后检查数据')
    seen.add(game.id)
    return { game, played: timestampKey(game.played_at), created: timestampKey(game.created_at) }
  })
  keyed.sort((a, b) => {
    if (a.played !== b.played) return a.played < b.played ? -1 : 1
    if (a.created !== b.created) return a.created < b.created ? -1 : 1
    return a.game.id < b.game.id ? -1 : a.game.id > b.game.id ? 1 : 0
  })
  return keyed.map(({ game }) => game)
}
export function replayDanHistory(games: readonly DanGame[], playerIds: readonly string[] = []) {
  const players = new Map<string, DanState>()
  playerIds.forEach(id => players.set(id, initialDanState()))
  for (const game of chronologicalGames(games)) {
    const results = game.game_results
    if (!Array.isArray(results) || results.length !== 4 ||
        results.some(row => !row.player_id) || new Set(results.map(row => row.player_id)).size !== 4) {
      throw new DanDataError(`对局 ${game.id} 不是四名不同玩家，段位判定已暂停`)
    }
    const ranks = effectiveRanks(results.map(row => row.raw_score))
    results.forEach((row, index) => {
      const state = players.get(row.player_id) ?? initialDanState()
      players.set(row.player_id, state)
      state.totalGames += 1
      state.gamesSincePromotion += 1
      const rule = nextDanRule(state.dan)
      if (!rule) return // Ten dan is the cap. No normal demotion.
      state.window.push({ gameId: game.id, playedAt: game.played_at, rank: ranks[index] })
      if (state.window.length > rule.windowSize) state.window.shift()
      const sum = state.window.reduce((total, item) => total + item.rank, 0)
      // Ranks are integer/half-integer. Compare exact values, never rounded averages.
      if (state.window.length === rule.windowSize && sum * 10 <= rule.windowSize * rule.averageTenths) {
        state.promotions.push({
          gameId: game.id, playedAt: game.played_at, from: state.dan, to: rule.to,
          rankSum: sum, average: sum / rule.windowSize,
          windowGameIds: state.window.map(item => item.gameId),
        })
        state.dan = rule.to
        state.gamesSincePromotion = 0
        state.window = [] // The promotion game is NOT reused for the next stage.
      }
    })
  }
  return players
}
export function danProgress(state: DanState) {
  const rule = nextDanRule(state.dan)
  const count = state.window.length
  const rankSum = state.window.reduce((sum, sample) => sum + sample.rank, 0)
  return {
    rule, count, rankSum, average: count ? rankSum / count : null,
    remaining: rule ? Math.max(0, rule.windowSize - count) : 0,
    // Only half-point sums are attainable; show this beside non-attainable thresholds.
    maximumSum: rule ? rule.windowSize * rule.averageTenths / 10 : null,
    attainableSum: rule ? Math.floor(rule.windowSize * rule.averageTenths / 5) / 2 : null,
  }
}
