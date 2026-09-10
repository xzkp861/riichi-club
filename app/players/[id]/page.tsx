import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import { INITIAL_RATING } from '@/lib/rating'

export const dynamic = 'force-dynamic'

type Result = {
  game_id: string
  player_id: string
  rank: number
  raw_score: number
  final_score: number
  games: { played_at: string } | { played_at: string }[] | null
  players: { id: string; name: string } | { id: string; name: string }[] | null
}

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value
}

function fmt(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function LineChart({ values, invert = false }: { values: number[]; invert?: boolean }) {
  if (!values.length) return <p className="muted">暂无数据</p>
  const width = 760
  const height = 220
  const pad = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const points = values.map((v, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, values.length - 1)
    const normalized = (v - min) / span
    const y = invert
      ? pad + normalized * (height - pad * 2)
      : height - pad - normalized * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 520 }} aria-label="趋势图">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.split(' ').map((p, i) => {
          const [cx, cy] = p.split(',')
          return <circle key={i} cx={cx} cy={cy} r="4" fill="currentColor" />
        })}
        <text x="4" y="18" fontSize="12">{invert ? min : max}</text>
        <text x="4" y={height - 6} fontSize="12">{invert ? max : min}</text>
      </svg>
    </div>
  )
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createPublicClient()

  const { data: player } = await supabase.from('players').select('id,name').eq('id', id).single()
  if (!player) notFound()

  const { data: allResults } = await supabase
    .from('game_results')
    .select('game_id,player_id,rank,raw_score,final_score,games(played_at),players(id,name)')

  const { data: ratingHistory } = await supabase
    .from('rating_history')
    .select('game_id,rating_before,rating_change,rating_after,games(played_at)')
    .eq('player_id', id)
    .order('games(played_at)', { ascending: true })

  const results = (allResults ?? []) as Result[]
  const mine = results
    .filter((r) => r.player_id === id)
    .sort((a, b) => new Date(one(a.games)?.played_at ?? 0).getTime() - new Date(one(b.games)?.played_at ?? 0).getTime())

  const pt = mine.reduce((sum, r) => sum + Number(r.final_score), 0)
  const avgRank = mine.length ? mine.reduce((sum, r) => sum + Number(r.rank), 0) / mine.length : 0
  const firstRate = mine.length ? mine.filter((r) => Number(r.rank) === 1).length / mine.length : 0
  const fourthRate = mine.length ? mine.filter((r) => Number(r.rank) === 4).length / mine.length : 0
  const currentRating = ratingHistory?.length ? Number(ratingHistory[ratingHistory.length - 1].rating_after) : INITIAL_RATING

  const byGame = new Map<string, Result[]>()
  for (const r of results) {
    const list = byGame.get(r.game_id) ?? []
    list.push(r)
    byGame.set(r.game_id, list)
  }

  const versus = new Map<string, { id: string; name: string; games: number; wins: number }>()
  for (const me of mine) {
    for (const opponent of byGame.get(me.game_id) ?? []) {
      if (opponent.player_id === id) continue
      const p = one(opponent.players)
      if (!p) continue
      const row = versus.get(p.id) ?? { id: p.id, name: p.name, games: 0, wins: 0 }
      row.games += 1
      if (Number(me.rank) < Number(opponent.rank)) row.wins += 1
      else if (Number(me.rank) === Number(opponent.rank)) row.wins += 0.5
      versus.set(p.id, row)
    }
  }

  const recent = [...mine].reverse().slice(0, 10)
  const ratingByGame = new Map((ratingHistory ?? []).map((r) => [r.game_id, r]))

  return (
    <main>
      <p><Link href="/">← 返回排行榜</Link></p>
      <h1>{player.name}</h1>

      <div className="grid">
        <div className="card"><div className="muted">Rate</div><h2>{currentRating.toFixed(1)}</h2></div>
        <div className="card"><div className="muted">累计 PT</div><h2>{fmt(pt)}</h2></div>
        <div className="card"><div className="muted">场次 / 均顺</div><h2>{mine.length} / {mine.length ? avgRank.toFixed(2) : '-'}</h2></div>
        <div className="card"><div className="muted">一位率 / 四位率</div><h2>{(firstRate * 100).toFixed(1)}% / {(fourthRate * 100).toFixed(1)}%</h2></div>
      </div>

      <div className="card">
        <h2>Rate 曲线</h2>
        <LineChart values={(ratingHistory ?? []).map((r) => Number(r.rating_after))} />
      </div>

      <div className="card">
        <h2>顺位曲线</h2>
        <LineChart values={mine.map((r) => Number(r.rank))} invert />
        <p className="muted">越靠上越好：1 = 一位，4 = 四位。</p>
      </div>

      <div className="card">
        <h2>VS 其他玩家</h2>
        <table>
          <thead><tr><th>玩家</th><th>同桌</th><th>胜场</th><th>胜率</th></tr></thead>
          <tbody>
            {[...versus.values()].sort((a, b) => (b.wins / b.games) - (a.wins / a.games)).map((v) => (
              <tr key={v.id}>
                <td><Link href={`/players/${v.id}`}><strong>{v.name}</strong></Link></td>
                <td>{v.games}</td>
                <td>{v.wins.toFixed(1)}</td>
                <td>{((v.wins / v.games) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">顺位优于对手计 1 胜；同顺计 0.5 胜。</p>
      </div>

      <div className="card">
        <h2>最近战绩</h2>
        <table>
          <thead><tr><th>日期</th><th>顺位</th><th>PT</th><th>Rate</th></tr></thead>
          <tbody>
            {recent.map((r) => {
              const rh = ratingByGame.get(r.game_id)
              return (
                <tr key={r.game_id}>
                  <td>{new Date(one(r.games)?.played_at ?? '').toLocaleDateString('zh-CN')}</td>
                  <td>{r.rank} 位</td>
                  <td>{fmt(Number(r.final_score))}</td>
                  <td>{rh ? fmt(Number(rh.rating_change)) : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
