import { chronologicalGames, type DanGame } from './dan'

/** Recent PT/statistics use the personal window; total PT and Rate remain lifetime. */
export const RECENT_GAME_LIMIT = 30
export type RankingPlayer = { id: string; name: string; ranking_excluded: boolean }
type RankingGame = Omit<DanGame, 'game_results'> & {
  game_results: { player_id: string; raw_score: number; rank: number; final_score: number | string }[]
}
type RatingSnapshot = { rating_after: number; games_before: number }
export type LeaderboardRow = {
  id: string
  name: string
  excluded: boolean
  status: 'ranked' | 'no-games' | 'rating-pending' | 'excluded'
  position: number | null
  recentPt: number | null
  totalPt: number | null
  rate: number | null
  totalGames: number | null
  recentGames: number | null
  avgRank: number | null
  firstRate: number | null
  fourthRate: number | null
}
export type LeaderboardSortKey = 'recentPt' | 'totalPt' | 'rate' | 'totalGames' | 'avgRank' | 'firstRate' | 'fourthRate'
export type SortDirection = 'asc' | 'desc'
export const DEFAULT_SORT: LeaderboardSortKey = 'recentPt'
export const SORT_DIRECTIONS: Record<LeaderboardSortKey, SortDirection> = {
  recentPt: 'desc', totalPt: 'desc', rate: 'desc', totalGames: 'desc', avgRank: 'asc', firstRate: 'desc', fourthRate: 'asc',
}

/** Stored final_score has one decimal. Sum tenths so floating-point noise cannot break ties. */
function ptTenths(value: number | string): number {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !value.trim())) throw new Error('对局 PT 数据不完整，请管理员检查历史记录')
  const scaled = Number(value) * 10
  const rounded = Math.round(scaled)
  if (!Number.isFinite(scaled) || !Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 0.000001) {
    throw new Error('对局 PT 数据不完整，请管理员检查历史记录')
  }
  return rounded
}

function sortValue(row: LeaderboardRow, key: LeaderboardSortKey): number | null {
  if (row.excluded || !row.recentGames) return null
  return row[key]
}

/** Sort all players before searching. Equal primary values share rank (1, 1, 3). */
export function sortLeaderboard(
  rows: readonly LeaderboardRow[],
  key: LeaderboardSortKey = DEFAULT_SORT,
  direction: SortDirection = SORT_DIRECTIONS[key],
): LeaderboardRow[] {
  const ordered = rows.map(row => ({ ...row, position: null as number | null }))
  ordered.sort((a, b) => {
    if (a.excluded !== b.excluded) return a.excluded ? 1 : -1
    const av = sortValue(a, key), bv = sortValue(b, key)
    if (av === null || bv === null) {
      if (av !== bv) return av === null ? 1 : -1
    } else if (av !== bv) return direction === 'asc' ? av - bv : bv - av
    return a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id)
  })
  let rankedCount = 0
  let previousValue: number | null = null
  let previousPosition = 0
  for (const row of ordered) {
    const value = sortValue(row, key)
    if (value === null) continue
    rankedCount += 1
    if (value !== previousValue) previousPosition = rankedCount
    row.position = previousPosition
    previousValue = value
  }
  return ordered
}

/** Kept under the existing name for callers; the default order is now recent PT. */
export function buildRateLeaderboard(
  players: readonly RankingPlayer[],
  games: readonly RankingGame[],
  ratings: ReadonlyMap<string, RatingSnapshot>,
): LeaderboardRow[] {
  const careers = new Map(players.map(player => [player.id, {
    count: 0, lastGameId: '', totalPtTenths: 0, recent: [] as { rank: number; pt: number }[],
  }]))
  for (const game of chronologicalGames(games)) {
    const results = game.game_results
    if (!Array.isArray(results) || results.length !== 4 ||
        new Set(results.map(row => row.player_id)).size !== 4 ||
        results.some(row => !careers.has(row.player_id) || !Number.isSafeInteger(row.raw_score) ||
          !Number.isInteger(row.rank) || row.rank < 1 || row.rank > 4) ||
        results.reduce((sum, row) => sum + row.raw_score, 0) !== 100000) {
      throw new Error('发现不完整对局，请管理员检查历史记录')
    }
    for (const result of results) {
      const career = careers.get(result.player_id)!
      const scoreTenths = ptTenths(result.final_score)
      career.count += 1
      career.lastGameId = game.id
      career.totalPtTenths += scoreTenths
      if (!Number.isSafeInteger(career.totalPtTenths)) throw new Error('累计 PT 超出安全计算范围')
      career.recent.push({ rank: result.rank, pt: scoreTenths })
      if (career.recent.length > RECENT_GAME_LIMIT) career.recent.shift()
    }
  }

  const rows: LeaderboardRow[] = players.map(player => {
    const base = { id: player.id, name: player.name, position: null }
    // Never serialize excluded players' metrics into the public table component.
    if (player.ranking_excluded) return {
      ...base, excluded: true, status: 'excluded', recentPt: null, totalPt: null, rate: null,
      totalGames: null, recentGames: null, avgRank: null, firstRate: null, fourthRate: null,
    }
    const career = careers.get(player.id)!
    const recent = career.recent
    const snapshot = ratings.get(`${career.lastGameId}:${player.id}`)
    const storedRate = snapshot ? Number(snapshot.rating_after) : NaN
    const rate = career.count > 0 && snapshot &&
      Number(snapshot.games_before) === career.count - 1 && Number.isFinite(storedRate)
      ? storedRate : null
    return {
      ...base, excluded: false,
      status: !career.count ? 'no-games' : rate === null ? 'rating-pending' : 'ranked',
      recentPt: recent.length ? recent.reduce((sum, sample) => sum + sample.pt, 0) / 10 : null,
      totalPt: career.count ? career.totalPtTenths / 10 : null,
      rate,
      totalGames: career.count,
      recentGames: recent.length,
      avgRank: recent.length ? recent.reduce((sum, sample) => sum + sample.rank, 0) / recent.length : null,
      firstRate: recent.length ? recent.filter(sample => sample.rank === 1).length / recent.length : null,
      fourthRate: recent.length ? recent.filter(sample => sample.rank === 4).length / recent.length : null,
    }
  })
  return sortLeaderboard(rows)
}
