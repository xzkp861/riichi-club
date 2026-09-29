import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { INITIAL_RATING } from '@/lib/rating'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createPublicClient()
    const [playersQuery, resultsQuery, ratingsQuery] = await Promise.all([
      supabase.from('players').select('id,name'),
      supabase.from('game_results').select('player_id,rank,final_score'),
      supabase.from('rating_history').select('player_id,rating_after,games_before').order('games_before', { ascending: true }),
    ])
    for (const query of [playersQuery, resultsQuery, ratingsQuery]) if (query.error) throw query.error

    const stats = new Map((playersQuery.data ?? []).map(p => [p.id, {
      id: p.id, name: p.name, games: 0, rankSum: 0, firsts: 0, fourths: 0, ptSum: 0,
    }]))
    for (const row of resultsQuery.data ?? []) {
      const player = stats.get(row.player_id)
      if (!player) continue
      player.games++
      player.rankSum += Number(row.rank)
      if (Number(row.rank) === 1) player.firsts++
      if (Number(row.rank) === 4) player.fourths++
      player.ptSum += Number(row.final_score)
    }
    const latest = new Map<string, { rating: number; gamesBefore: number }>()
    for (const row of ratingsQuery.data ?? []) {
      const gamesBefore = Number(row.games_before)
      if (!latest.has(row.player_id) || gamesBefore >= latest.get(row.player_id)!.gamesBefore) {
        latest.set(row.player_id, { rating: Number(row.rating_after), gamesBefore })
      }
    }
    const leaderboard = [...stats.values()].filter(p => p.games > 0).map(p => ({
      id: p.id, name: p.name, games: p.games, pt: Number(p.ptSum.toFixed(1)),
      rate: latest.get(p.id)?.rating ?? INITIAL_RATING,
      avgRank: p.rankSum / p.games, firstRate: p.firsts / p.games,
      fourthRate: p.fourths / p.games, avgPt: p.ptSum / p.games,
    }))
    leaderboard.sort((a, b) => b.pt - a.pt || a.name.localeCompare(b.name))
    return NextResponse.json({ leaderboard })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '读取排行榜失败' }, { status: 500 })
  }
}
