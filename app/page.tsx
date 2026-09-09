import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createPublicClient()

  const { data: results } = await supabase
    .from('game_results')
    .select(`
      player_id,
      rank,
      final_score,
      players (
        id,
        name
      )
    `)

  const stats = new Map<
    string,
    {
      id: string
      name: string
      games: number
      rankSum: number
      firsts: number
      fourths: number
      scoreSum: number
    }
  >()

  for (const r of results ?? []) {
    const player = Array.isArray(r.players)
      ? r.players[0]
      : r.players

    if (!player) continue

    if (!stats.has(player.id)) {
      stats.set(player.id, {
        id: player.id,
        name: player.name,
        games: 0,
        rankSum: 0,
        firsts: 0,
        fourths: 0,
        scoreSum: 0,
      })
    }

    const s = stats.get(player.id)!

    s.games += 1
    s.rankSum += Number(r.rank)

    if (Number(r.rank) === 1) s.firsts += 1
    if (Number(r.rank) === 4) s.fourths += 1

    s.scoreSum += Number(r.final_score)
  }

  const leaderboard = [...stats.values()]
    .map((s) => ({
      ...s,
      avgRank: s.games ? s.rankSum / s.games : 0,
      firstRate: s.games ? s.firsts / s.games : 0,
      fourthRate: s.games ? s.fourths / s.games : 0,
      avgScore: s.games ? s.scoreSum / s.games : 0,
    }))
    .sort((a, b) => a.avgRank - b.avgRank)

  return (
    <main>
      <h1>排行榜</h1>

      <p className="muted">
        按平均顺位排序。场次少时波动会比较大。
      </p>

      <div className="card">
        {leaderboard.length === 0 ? (
          <p className="muted">
            还没有数据。先添加玩家并录入第一场。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>玩家</th>
                <th>场次</th>
                <th>平均顺位</th>
                <th>一位率</th>
                <th>四位率</th>
                <th>平均积分</th>
                <th>总积分</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.games}</td>
                  <td>{p.avgRank.toFixed(2)}</td>
                  <td>
                    {(p.firstRate * 100).toFixed(1)}%
                  </td>
                  <td>
                    {(p.fourthRate * 100).toFixed(1)}%
                  </td>
                  <td>{p.avgScore.toFixed(1)}</td>
                  <td>{p.scoreSum.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ marginTop: 32 }}>最近对局</h2>

      <p>
        <Link href="/games">查看全部历史对局 →</Link>
      </p>
    </main>
  )
}