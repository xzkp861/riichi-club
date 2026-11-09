import RateLeaderboard from '@/components/RateLeaderboard'
import PlayerDirectory from '@/components/PlayerDirectory'
import { createPublicClient } from '@/lib/supabase/public'
import { loadClubHistory } from '@/lib/club-data'
import { buildRateLeaderboard } from '@/lib/leaderboard'
import { loadRankingPlayers } from '@/lib/ranking-players'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  try {
    const [club, preferences] = await Promise.all([
      loadClubHistory(), loadRankingPlayers(createPublicClient()),
    ])
    // Do not guess a preference if a player is added/deleted during these reads.
    if (club.players.length !== preferences.players.length ||
        preferences.players.some(player => !club.playerById.has(player.id))) {
      throw new Error('玩家列表正在更新，请刷新')
    }
    if (!preferences.rankingSettingsReady) return <main>
      <h1>玩家主页</h1>
      <p className="muted">排行榜正在准备中，暂时保留个人主页入口。</p>
      <PlayerDirectory players={[...club.players].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id))} />
    </main>
    const rows = buildRateLeaderboard(preferences.players, club.games, club.ratingByGamePlayer)
    return <main>
      <h1>战绩排行榜</h1>
      <p className="muted">默认按近30场 PT 总和从高到低排列；点击 Rate 或其他统计表头可切换排序。</p>
      <p className="muted">PT、均顺、一位率、四位率只统计每位玩家自己的最近 30 个半庄；不足 30 场按实际场数，不补足、不折算。</p>
      <p className="muted">总场数为全部历史半庄数。生涯 Rate 仍从第一场起结合当时同桌 Rate 完整计算，不截断、不重置。个人主页保留完整历史。</p>
      <RateLeaderboard rows={rows} />
    </main>
  } catch {
    return <main><h1>战绩排行榜</h1><div className="card" role="alert">暂时无法读取完整战绩或参榜设置，请刷新重试。为避免错误展示，暂不生成排名。</div></main>
  }
}
