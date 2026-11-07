import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadClubData } from '@/lib/club-data'
import { danLabel, effectiveRanks } from '@/lib/dan'
import DanPanel from '@/components/DanPanel'

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
  let club: Awaited<ReturnType<typeof loadClubData>>
  try { club = await loadClubData() } catch {
    return <main><h1>玩家档案</h1><div className="card" role="alert">暂时无法读取完整战绩，段位判定已暂停。请刷新重试，或请管理员核对是否存在不完整对局。</div></main>
  }
  const player = club.playerById.get(id)
  if (!player) notFound()
  const state = club.standings.get(id)!
  const mine = club.games.flatMap(game => {
    const index = game.game_results.findIndex(row => row.player_id === id)
    return index < 0 ? [] : [{ game, result: game.game_results[index],
      assessmentRank: effectiveRanks(game.game_results.map(row => row.raw_score))[index],
      rating: club.ratingByGamePlayer.get(`${game.id}:${id}`) }]
  })
  const count = mine.length
  const pt = mine.reduce((sum, row) => sum + Number(row.result.final_score), 0)
  const avgRank = count ? mine.reduce((sum, row) => sum + Number(row.result.rank), 0) / count : null
  const rankCounts = [1, 2, 3, 4].map(rank => mine.filter(row => row.result.rank === rank).length)
  const lastRating = mine[count - 1]?.rating
  const currentRating = !count ? 1500 : lastRating ? Number(lastRating.rating_after) : null
  const rated = mine.filter(row => row.rating)
  const peakRating = rated.reduce((peak, row) => Math.max(peak, Number(row.rating!.rating_after)), 1500)
  const best = mine.reduce<(typeof mine)[number] | null>((a, row) => !a || Number(row.result.final_score) > Number(a.result.final_score) ? row : a, null)
  const worst = mine.reduce<(typeof mine)[number] | null>((a, row) => !a || Number(row.result.final_score) < Number(a.result.final_score) ? row : a, null)
  const promotions = new Map(state.promotions.map(event => [event.gameId, event]))
  const versus = new Map<string, { id: string; name: string; games: number; wins: number }>()
  for (const me of mine) for (const opponent of me.game.game_results) {
    if (opponent.player_id === id) continue
    const row = versus.get(opponent.player_id) ?? { id: opponent.player_id, name: club.playerById.get(opponent.player_id)?.name ?? '未知玩家', games: 0, wins: 0 }
    row.games += 1
    row.wins += me.result.raw_score > opponent.raw_score ? 1 : me.result.raw_score === opponent.raw_score ? 0.5 : 0
    versus.set(row.id, row)
  }
  return <main>
    <p><Link href="/">← 返回排行榜</Link></p>
    <section className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div><h1 style={{ marginBottom: 8 }}>{player.name}</h1><p className="muted">BOS RIICHI · {danLabel(state.dan)} · {count} 半庄</p></div>
      <div><div className="muted">当前 Rate</div><strong style={{ fontSize: 32 }}>{currentRating?.toFixed(1) ?? '待重算'}</strong><p className="muted">最近变化 {lastRating ? fmt(Number(lastRating.rating_change), 2) : '—'}</p></div>
    </section>
    <div id="dan-progress"><DanPanel state={state} /></div>
    <div className="grid">
      <div className="card"><div className="muted">累计 PT / 平均 PT</div><h2>{fmt(pt)} / {count ? fmt(pt / count) : '—'}</h2></div>
      <div className="card"><div className="muted">场次 / 原统计均顺</div><h2>{count} / {avgRank?.toFixed(2) ?? '—'}</h2></div>
      <div className="card"><div className="muted">一位率 / 连对率</div><h2>{count ? pct(rankCounts[0] / count) : '—'} / {count ? pct((rankCounts[0] + rankCounts[1]) / count) : '—'}</h2></div>
      <div className="card"><div className="muted">四位率 / 历史最高 Rate</div><h2>{count ? pct(rankCounts[3] / count) : '—'} / {peakRating.toFixed(1)}</h2></div>
    </div>
    <section className="card"><h2>晋级履历</h2>
      {!state.promotions.length ? <p className="muted">从初段开始，尚无晋级记录。</p> : <div style={{ overflowX: 'auto' }}><table>
        <thead><tr><th>日期</th><th>晋级</th><th>考核场数</th><th>顺位和</th><th>考核均顺</th><th>达标对局</th></tr></thead>
        <tbody>{[...state.promotions].reverse().map(event => <tr key={event.gameId}>
          <td>{date(event.playedAt)}</td><td>{danLabel(event.from)} → {danLabel(event.to)}</td><td>{event.windowGameIds.length}</td>
          <td>{event.rankSum}</td><td>{event.average.toFixed(3)}</td><td><Link href={`/games#${event.gameId}`}>查看本场</Link></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <section className="card"><h2>顺位分布</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
        {rankCounts.map((n, i) => <div key={i}><div className="muted">{i + 1} 位</div><strong style={{ fontSize: 24 }}>{n}</strong><div>{count ? pct(n / count) : '—'}</div></div>)}
      </div><p className="muted">此处沿用原记录的并列名次；升段考核单独使用平均名次，不混用两个指标。</p>
    </section>
    <div className="grid">{[['最佳单场', best], ['最低单场', worst]].map(([label, item]) => {
      const row = item as (typeof mine)[number] | null
      return <section className="card" key={String(label)}><div className="muted">{String(label)}</div><h2>{row ? fmt(Number(row.result.final_score)) : '—'}</h2>
        {row && <Link href={`/games#${row.game.id}`}>{row.result.rank} 位 · {date(row.game.played_at)}</Link>}</section>
    })}</div>
    <section className="card"><h2>Rate 曲线</h2>
      {rated.length !== count ? <p className="muted">部分 Rate 历史尚未重算，暂不绘制不完整曲线。</p> : <LineChart values={mine.map(row => Number(row.rating!.rating_after))} />}
    </section>
    <section className="card"><h2>顺位曲线</h2><LineChart values={mine.map(row => row.result.rank)} rank /><p className="muted">沿用对局显示的并列名次，越靠上越好。</p></section>
    <section className="card"><h2>VS 其他玩家</h2><div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>玩家</th><th>同桌</th><th>折算胜场</th><th>胜率</th></tr></thead>
      <tbody>{[...versus.values()].sort((a, b) => b.wins / b.games - a.wins / a.games).map(row => <tr key={row.id}>
        <td><Link href={`/players/${row.id}`}>{row.name}</Link></td><td>{row.games}</td><td>{row.wins.toFixed(1)}</td><td>{pct(row.wins / row.games)}</td>
      </tr>)}</tbody></table></div><p className="muted">同桌终局点数领先计 1 胜，同点计 0.5 胜。</p>
    </section>
    <section className="card"><h2>最近 10 场</h2><div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>日期</th><th>显示顺位</th><th>考核顺位</th><th>终局点数</th><th>PT</th><th>Rate变化</th><th>晋级</th></tr></thead>
      <tbody>{[...mine].reverse().slice(0, 10).map(row => <tr key={row.game.id}>
        <td><Link href={`/games#${row.game.id}`}>{date(row.game.played_at)}</Link></td><td>{row.result.rank} 位</td><td>{row.assessmentRank}</td>
        <td>{row.result.raw_score.toLocaleString()}</td><td>{fmt(Number(row.result.final_score))}</td><td>{row.rating ? fmt(Number(row.rating.rating_change), 2) : '—'}</td>
        <td>{promotions.has(row.game.id) ? `升至${danLabel(promotions.get(row.game.id)!.to)}` : '—'}</td>
      </tr>)}</tbody></table></div>
    </section>
  </main>
}
