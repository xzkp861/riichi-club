import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadClubHistory } from '@/lib/club-data'

export const dynamic = 'force-dynamic'
const fmt = (value: number, digits = 1) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
const pct = (value: number) => `${(value * 100).toFixed(1)}%`
const date = (value: string) => new Date(value).toLocaleDateString('zh-CN')

function LineChart({ values, rank = false }: { values: number[]; rank?: boolean }) {
  if (!values.length) return <p className="muted">暂无数据</p>
  const width = 760, height = 220, pad = 36
  const min = rank ? 1 : values.reduce((a, b) => Math.min(a, b), Infinity)
  const max = rank ? 4 : values.reduce((a, b) => Math.max(a, b), -Infinity)
  const points = values.map((v, i) => {
    const x = pad + i * (width - pad * 2) / Math.max(1, values.length - 1)
    const t = max === min ? 0.5 : (v - min) / (max - min)
    return { x, y: rank ? pad + t * (height - pad * 2) : height - pad - t * (height - pad * 2), v }
  })
  return <div style={{ overflowX: 'auto' }}><svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 300 }} role="img" aria-label={rank ? '历史顺位曲线，一位在上四位在下' : '历史 Rate 曲线'}>
    <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
    {points.map((p, index) => <circle key={index} cx={p.x} cy={p.y} r="3" fill="currentColor"><title>第 {index + 1} 场：{p.v}</title></circle>)}
    <text x="0" y="20" fontSize="12">{rank ? '1位' : max.toFixed(1)}</text><text x="0" y={height - 15} fontSize="12">{rank ? '4位' : min.toFixed(1)}</text>
  </svg></div>
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let club: Awaited<ReturnType<typeof loadClubHistory>>
  try { club = await loadClubHistory() } catch {
    return <main><h1>个人主页</h1><div className="card" role="alert">暂时无法读取完整战绩，请刷新重试。</div><Link href="/">返回玩家列表 →</Link></main>
  }
  const player = club.playerById.get(id)
  if (!player) notFound()
  const mine = club.games.flatMap(game => {
    const index = game.game_results.findIndex(row => row.player_id === id)
    return index < 0 ? [] : [{ game, result: game.game_results[index],
      rating: club.ratingByGamePlayer.get(`${game.id}:${id}`) }]
  })
  const count = mine.length
  const avgRank = count ? mine.reduce((sum, row) => sum + Number(row.result.rank), 0) / count : null
  const rankCounts = [1, 2, 3, 4].map(rank => mine.filter(row => row.result.rank === rank).length)
  const lastRating = mine[count - 1]?.rating
  const currentRating = !count ? 1500 : lastRating ? Number(lastRating.rating_after) : null
  const rated = mine.filter(row => row.rating)
  const peakRating = rated.reduce((peak, row) => Math.max(peak, Number(row.rating!.rating_after)), 1500)
  const versus = new Map<string, { id: string; name: string; games: number; wins: number }>()
  for (const me of mine) for (const opponent of me.game.game_results) {
    if (opponent.player_id === id) continue
    const row = versus.get(opponent.player_id) ?? { id: opponent.player_id, name: club.playerById.get(opponent.player_id)?.name ?? '未知玩家', games: 0, wins: 0 }
    row.games += 1
    row.wins += me.result.raw_score > opponent.raw_score ? 1 : me.result.raw_score === opponent.raw_score ? 0.5 : 0
    versus.set(row.id, row)
  }
  return <main>
    <p><Link href="/">← 返回玩家列表</Link></p>
    <section className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div><h1 style={{ marginBottom: 8 }}>{player.name}</h1><p className="muted">BOS RIICHI · {count} 半庄</p></div>
      <div><div className="muted">当前 Rate</div><strong style={{ fontSize: 32 }}>{currentRating?.toFixed(1) ?? '待重算'}</strong><p className="muted">最近变化 {lastRating ? fmt(Number(lastRating.rating_change), 2) : '—'}</p></div>
    </section>
    <div className="grid">
      <div className="card"><div className="muted">场次 / 均顺</div><h2>{count} / {avgRank?.toFixed(2) ?? '—'}</h2></div>
      <div className="card"><div className="muted">一位率 / 连对率</div><h2>{count ? pct(rankCounts[0] / count) : '—'} / {count ? pct((rankCounts[0] + rankCounts[1]) / count) : '—'}</h2></div>
      <div className="card"><div className="muted">四位率</div><h2>{count ? pct(rankCounts[3] / count) : '—'}</h2></div>
      <div className="card"><div className="muted">历史最高 Rate</div><h2>{peakRating.toFixed(1)}</h2></div>
    </div>
    <section className="card"><h2>顺位分布</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
        {rankCounts.map((n, i) => <div key={i}><div className="muted">{i + 1} 位</div><strong style={{ fontSize: 24 }}>{n}</strong><div>{count ? pct(n / count) : '—'}</div></div>)}
      </div><p className="muted">沿用历史对局记录的并列名次统计。</p>
    </section>
    <section className="card"><h2>Rate 曲线</h2>
      {rated.length !== count ? <p className="muted">部分 Rate 历史尚未重算，暂不绘制不完整曲线。</p> : <LineChart values={mine.map(row => Number(row.rating!.rating_after))} />}
    </section>
    <section className="card"><h2>顺位曲线</h2><LineChart values={mine.map(row => row.result.rank)} rank /><p className="muted">沿用对局显示的并列名次，越靠上越好。</p></section>
    <section className="card"><h2>VS 其他玩家</h2><div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>玩家</th><th>同桌</th><th>折算胜场</th><th>胜率</th></tr></thead>
      <tbody>{[...versus.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id)).map(row => <tr key={row.id}>
        <td><Link href={`/players/${row.id}`}>{row.name}</Link></td><td>{row.games}</td><td>{row.wins.toFixed(1)}</td><td>{pct(row.wins / row.games)}</td>
      </tr>)}</tbody></table></div><p className="muted">同桌终局点数领先计 1 胜，同点计 0.5 胜；对手按姓名排列。</p>
    </section>
    <section className="card"><h2>最近 10 场</h2><div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>日期</th><th>顺位</th><th>终局点数</th><th>Rate变化</th></tr></thead>
      <tbody>{[...mine].reverse().slice(0, 10).map(row => <tr key={row.game.id}>
        <td><Link href={`/games#${row.game.id}`}>{date(row.game.played_at)}</Link></td><td>{row.result.rank} 位</td>
        <td>{row.result.raw_score.toLocaleString()}</td><td>{row.rating ? fmt(Number(row.rating.rating_change), 2) : '—'}</td>
      </tr>)}</tbody></table></div>
    </section>
  </main>
}
