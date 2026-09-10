import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('games')
    .select('id, played_at, game_results(id,seat,rank,raw_score,final_score,player_id,players(name))')
    .order('played_at', { ascending: false })

  const { data: ratingHistory } = await supabase
    .from('rating_history')
    .select('game_id,player_id,rating_change')

  const ratingChanges = new Map<string, number>()
  for (const row of ratingHistory ?? []) {
    ratingChanges.set(`${row.game_id}:${row.player_id}`, Number(row.rating_change))
  }

  const signed = (value: number) => value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)

  return <main><h1>历史对局</h1>{(data ?? []).map((g:any) => (
    <section className="card" id={g.id} key={g.id}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
        <b>{new Date(g.played_at).toLocaleString('zh-CN')}</b>
        <Link href={`/games/${g.id}/edit`}>编辑本场</Link>
      </div>
      <table><thead><tr><th>顺位</th><th>玩家</th><th>终局点数</th><th>积分</th><th>Rate变化</th></tr></thead>
      <tbody>{[...g.game_results].sort((a:any,b:any)=>a.rank-b.rank || a.seat-b.seat).map((r:any)=>{
        const change = ratingChanges.get(`${g.id}:${r.player_id}`)
        return <tr key={r.id}><td>{r.rank}</td><td>{r.players.name}</td><td>{r.raw_score}</td><td>{Number(r.final_score).toFixed(1)}</td><td>{change === undefined ? '—' : signed(change)}</td></tr>
      })}</tbody></table>
    </section>
  ))}</main>
}
