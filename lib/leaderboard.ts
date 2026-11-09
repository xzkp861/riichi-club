import { chronologicalGames, type DanGame } from './dan'

/** Rate is lifetime; only descriptive statistics use this per-player window. */
export const RECENT_GAME_LIMIT = 30
export type RankingPlayer = { id: string; name: string; ranking_excluded: boolean }
type RankingGame = Omit<DanGame, 'game_results'> & { game_results: { player_id: string; raw_score: number; rank: number }[] }
type RatingSnapshot = { rating_after: number; games_before: number }
export type LeaderboardRow = {
  id: string
  name: string
  excluded: boolean
  status: 'ranked' | 'no-games' | 'rating-pending' | 'excluded'
  position: number | null
  rate: number | null
  recentGames: number | null
  avgRank: number | null
  firstRate: number | null
  fourthRate: number | null
}

export function buildRateLeaderboard(
  players: readonly RankingPlayer[],
  games: readonly RankingGame[],
  ratings: ReadonlyMap<string, RatingSnapshot>,
): LeaderboardRow[] {
  const careers = new Map(players.map(player => [player.id, {
    count: 0, lastGameId: '', recentRanks: [] as number[],
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
      career.count += 1
      career.lastGameId = game.id
      career.recentRanks.push(result.rank)
      if (career.recentRanks.length > RECENT_GAME_LIMIT) career.recentRanks.shift()
    }
  }

  const rows: LeaderboardRow[] = players.map(player => {
    const base = { id: player.id, name: player.name, position: null }
    // Never serialize excluded players' metrics into the public table component.
    if (player.ranking_excluded) return {
      ...base, excluded: true, status: 'excluded', rate: null,
      recentGames: null, avgRank: null, firstRate: null, fourthRate: null,
    }
    const career = careers.get(player.id)!
    const recent = career.recentRanks
    const snapshot = ratings.get(`${career.lastGameId}:${player.id}`)
    const storedRate = snapshot ? Number(snapshot.rating_after) : NaN
    const rate = career.count > 0 && snapshot &&
      Number(snapshot.games_before) === career.count - 1 && Number.isFinite(storedRate)
      ? storedRate : null
    return {
      ...base, excluded: false,
      status: !career.count ? 'no-games' : rate === null ? 'rating-pending' : 'ranked',
      rate,
      recentGames: recent.length,
      avgRank: recent.length ? recent.reduce((sum, rank) => sum + rank, 0) / recent.length : null,
      firstRate: recent.length ? recent.filter(rank => rank === 1).length / recent.length : null,
      fourthRate: recent.length ? recent.filter(rank => rank === 4).length / recent.length : null,
    }
  })
  rows.sort((a, b) => {
    if (a.excluded !== b.excluded) return a.excluded ? 1 : -1
    if (a.rate === null || b.rate === null) {
      if (a.rate !== b.rate) return a.rate === null ? 1 : -1
    } else if (a.rate !== b.rate) return b.rate - a.rate
    return a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id)
  })
  let rankedCount = 0
  let previousRate: number | null = null
  let previousPosition = 0
  for (const row of rows) {
    if (row.status !== 'ranked' || row.rate === null) continue
    rankedCount += 1
    if (row.rate !== previousRate) previousPosition = rankedCount
    row.position = previousPosition
    previousRate = row.rate
  }
  return rows
}
