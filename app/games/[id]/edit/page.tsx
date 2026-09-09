'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = { id: string; name: string }
const SEATS = ['东', '南', '西', '北']

export default function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [playerIds, setPlayerIds] = useState(['','','',''])
  const [scores, setScores] = useState(['','','',''])
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('读取中...')
  const total = useMemo(() => scores.reduce((s, v) => s + (v === '' ? 0 : Number(v)), 0), [scores])
  const diff = 100000 - total
  const totalOK = scores.every((s) => s !== '') && total === 100000
  const playersOK = playerIds.every(Boolean) && new Set(playerIds).size === 4

  useEffect(() => {
    fetch(`/api/games/${id}`, { cache: 'no-store' })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (!ok) return setMessage(data.error ?? '读取失败')
        setPlayers(data.players ?? [])
        const results = [...data.game.game_results].sort((a: any, b: any) => a.seat - b.seat)
        setPlayerIds(results.map((r: any) => r.player_id))
        setScores(results.map((r: any) => String(r.raw_score)))
        setMessage('')
      })
      .catch((e) => setMessage(e.message))
  }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!totalOK) return setMessage(`总分必须为 100000，目前为 ${total}`)
    if (!playersOK) return setMessage('请选择四位不同的玩家')
    const res = await fetch(`/api/games/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIds, scores: scores.map(Number), pin }),
    })
    const data = await res.json()
    if (!res.ok) return setMessage(data.error ?? '修改失败')
    router.push('/games')
    router.refresh()
  }

  return (
    <main>
      <h1>修改对局</h1>
      {message && <div className="card">{message}</div>}
      <div className="card">
        <form onSubmit={save}>
          {[0,1,2,3].map((i) => (
            <div className="grid" style={{ marginBottom: 10 }} key={i}>
              <select value={playerIds[i]} onChange={(e) => setPlayerIds((p) => p.map((v,j) => j===i ? e.target.value : v))} required>
                <option value="">{SEATS[i]} · 选择玩家</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" step="100" value={scores[i]} onChange={(e) => setScores((p) => p.map((v,j) => j===i ? e.target.value : v))} required />
            </div>
          ))}
          <div className="card" style={{ margin: '12px 0' }}>
            <b>当前合计：{total.toLocaleString()} / 100,000</b>
            <div className="muted" style={{ marginTop: 6 }}>{totalOK ? '✓ 总分正确' : diff > 0 ? `还差 ${diff.toLocaleString()} 点` : `多出 ${Math.abs(diff).toLocaleString()} 点`}</div>
          </div>
          <input type="password" placeholder="管理员 PIN" value={pin} onChange={(e) => setPin(e.target.value)} required style={{ marginRight: 10 }} />
          <button type="submit" disabled={!totalOK || !playersOK} style={{ opacity: totalOK && playersOK ? 1 : 0.5 }}>保存修改</button>
        </form>
      </div>
    </main>
  )
}
