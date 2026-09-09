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
      ptSum: number
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
        ptSum: 0,
      })
    }

    const s = stats.get(player.id)!

    s.games += 1
    s.rankSum += Number(r.rank)

    if (Number(r.rank) === 1) s.firsts += 1
    if (Number(r.rank) === 4) s.fourths += 1

    s.ptSum += Number(r.final_score)
  }

  const leaderboard = [...stats.values()]
    .map((s) => ({
      ...s,
      avgRank: s.games ? s.rankSum / s.games : 0,
      firstRate: s.games ? s.firsts / s.games : 0,
      fourthRate: s.games ? s.fourths / s.games : 0,
      avgPt: s.games ? s.ptSum / s.games : 0,
    }))
    // 主排行榜：累计 PT 从高到低
    .sort((a, b) => b.ptSum - a.ptSum)

  const formatPt = (value: number) => {
    if (value > 0) return `+${value.toFixed(1)}`
    return value.toFixed(1)
  }

  return (
    <main>
      <h1>PT 排行榜</h1>

      <p className="muted">
        按累计 PT 排名，采用 M.LEAGUE 计分规则。
      </p>

      <div className="card">
        {leaderboard.length === 0 ? (
          <p className="muted">
            还没有对局数据。先添加玩家并录入第一场。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>玩家</th>
                <th>PT</th>
                <th>场次</th>
                <th>均顺</th>
                <th>一位率</th>
                <th>四位率</th>
                <th>平均 PT</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((p, index) => (
                <tr key={p.id}>
                  <td>{index + 1}</td>

                  <td>
                    <strong>{p.name}</strong>
                  </td>

                  <td>
                    <strong>{formatPt(p.ptSum)}</strong>
                  </td>

                  <td>{p.games}</td>

                  <td>{p.avgRank.toFixed(2)}</td>

                  <td>
                    {(p.firstRate * 100).toFixed(1)}%
                  </td>

                  <td>
                    {(p.fourthRate * 100).toFixed(1)}%
                  </td>

                  <td>{formatPt(p.avgPt)}</td>
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
