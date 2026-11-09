import type { SupabaseClient } from '@supabase/supabase-js'
import { readAllPages, type ClubPlayer } from '@/lib/club-data'
import type { RankingPlayer } from '@/lib/leaderboard'
import { isMissingRankingColumn } from '@/lib/player-settings'

class RankingColumnNotReady extends Error {}

/** Old deployments keep working before the additive migration is applied. */
export async function loadRankingPlayers(db: SupabaseClient): Promise<{
  players: RankingPlayer[]; rankingSettingsReady: boolean
}> {
  try {
    const players = await readAllPages<RankingPlayer>(async (from, to) => {
      const result = await db.from('players')
        .select('id,name,ranking_excluded', { count: 'exact' })
        .order('id').range(from, to)
      if (result.error && isMissingRankingColumn(result.error)) throw new RankingColumnNotReady()
      return result
    })
    if (players.some(player => typeof player.ranking_excluded !== 'boolean')) {
      throw new Error('参榜设置数据不完整，请管理员核对')
    }
    return { players, rankingSettingsReady: true }
  } catch (error) {
    // Never fall back to "everyone participates" on a network/permission error.
    if (!(error instanceof RankingColumnNotReady)) throw error
    const players = await readAllPages<ClubPlayer>((from, to) => db.from('players')
      .select('id,name', { count: 'exact' }).order('id').range(from, to))
    return {
      players: players.map(player => ({ ...player, ranking_excluded: false })),
      rankingSettingsReady: false,
    }
  }
}
