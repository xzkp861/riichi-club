import { createAdminClient } from '@/lib/supabase/admin'

export const INITIAL_RATING = 1500
const PLACE_POINTS = [30, 10, -10, -30] as const

type GameResult = {
  player_id: string
  rank: number
}

type Game = {
  id: string
  played_at: string
  created_at: string
  game_results: GameResult[]
}

function placePoint(rank: number, allRanks: number[]) {
  const tied = allRanks.filter((r) => r === rank).length
  let occupiedBefore = 0

  for (const r of allRanks) {
    if (r < rank) occupiedBefore += 1
  }

  let total = 0
  for (let i = occupiedBefore; i < occupiedBefore + tied; i += 1) {
    total += PLACE_POINTS[i]
  }
  return total / tied
}

function coefficient(gamesBefore: number) {
  return gamesBefore < 400 ? 1 - 0.002 * gamesBefore : 0.2
}

export async function recalculateRatings() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('games')
    .select('id,played_at,created_at,game_results(player_id,rank)')
    .order('played_at', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  const games = (data ?? []) as Game[]
  const ratings = new Map<string, number>()
  const counts = new Map<string, number>()
  const history: Array<{
    game_id: string
    player_id: string
    rating_before: number
    rating_change: number
    rating_after: number
    games_before: number
  }> = []

  for (const game of games) {
    if (game.game_results.length !== 4) continue

    const before = game.game_results.map((r) => ratings.get(r.player_id) ?? INITIAL_RATING)
    const tableAverage = before.reduce((sum, r) => sum + r, 0) / 4
    const correctionAverage = Math.max(1500, tableAverage)
    const ranks = game.game_results.map((r) => Number(r.rank))

    game.game_results.forEach((result, index) => {
      const playerRating = before[index]
      const gamesBefore = counts.get(result.player_id) ?? 0
      const base = placePoint(Number(result.rank), ranks)
      const change = coefficient(gamesBefore) * (base + (correctionAverage - playerRating) / 40)
      const after = playerRating + change

      history.push({
        game_id: game.id,
        player_id: result.player_id,
        rating_before: Number(playerRating.toFixed(2)),
        rating_change: Number(change.toFixed(2)),
        rating_after: Number(after.toFixed(2)),
        games_before: gamesBefore,
      })

      ratings.set(result.player_id, after)
      counts.set(result.player_id, gamesBefore + 1)
    })
  }

  const { error: deleteError } = await supabase.from('rating_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) throw deleteError

  if (history.length) {
    const { error: insertError } = await supabase.from('rating_history').insert(history)
    if (insertError) throw insertError
  }
}
