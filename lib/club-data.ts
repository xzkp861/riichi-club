import { createPublicClient } from '@/lib/supabase/public'
import { chronologicalGames, replayDanHistory } from './dan'

export type ClubPlayer = { id: string; name: string }
export type ClubResult = { id: string; player_id: string; seat: number; rank: number; raw_score: number; final_score: number }
export type ClubGame = { id: string; played_at: string; created_at: string; game_results: ClubResult[] }
export type ClubRating = {
  id: string; game_id: string; player_id: string; rating_before: number
  rating_change: number; rating_after: number; games_before: number
}
type Page<T> = { data: T[] | null; error: { message: string } | null; count: number | null }

/** Counted pagination avoids Supabase's default row cap silently truncating careers. */
export async function readAllPages<T>(load: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = []
  let expected: number | null = null
  while (true) {
    const result = await load(rows.length, rows.length + 499)
    if (result.error) throw new Error(result.error.message)
    if (result.count === null) throw new Error('无法确认完整数据量，请刷新重试')
    if (expected === null) expected = result.count
    if (result.count !== expected) throw new Error('读取期间数据发生变化，请刷新重试')
    const page = result.data ?? []
    rows.push(...page)
    if (rows.length === expected) return rows
    if (!page.length || rows.length > expected) throw new Error('读取到的历史记录不完整，请刷新重试')
  }
}

/** Read-only player history; personal profiles do not depend on dan replay. */
export async function loadClubHistory() {
  const db = createPublicClient()
  const [players, rawGames, ratings] = await Promise.all([
    readAllPages<ClubPlayer>((from, to) => db.from('players')
      .select('id,name', { count: 'exact' }).order('id').range(from, to)),
    readAllPages<ClubGame>((from, to) => db.from('games')
      .select('id,played_at,created_at,game_results(id,player_id,seat,rank,raw_score,final_score)', { count: 'exact' })
      .order('id').range(from, to)),
    readAllPages<ClubRating>((from, to) => db.from('rating_history')
      .select('id,game_id,player_id,rating_before,rating_change,rating_after,games_before', { count: 'exact' })
      .order('id').range(from, to)),
  ])
  const games = chronologicalGames(rawGames)
  const playerById = new Map(players.map(player => [player.id, player]))
  const gameIds = new Set(games.map(game => game.id))
  const latestRatings = new Map<string, ClubRating>()
  const ratingByGamePlayer = new Map<string, ClubRating>()
  for (const row of ratings) {
    if (!gameIds.has(row.game_id)) continue
    ratingByGamePlayer.set(`${row.game_id}:${row.player_id}`, row)
    const current = latestRatings.get(row.player_id)
    if (!current || Number(row.games_before) > Number(current.games_before)) latestRatings.set(row.player_id, row)
  }
  return { players, games, playerById, latestRatings, ratingByGamePlayer }
}

/** Retained for future dan views. No stored ranks or historical records are removed. */
export async function loadClubData() {
  const club = await loadClubHistory()
  const standings = replayDanHistory(club.games, club.players.map(player => player.id))
  return { ...club, standings }
}
