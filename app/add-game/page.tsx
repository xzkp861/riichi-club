'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getOwnerAuthHeader } from '@/lib/supabase/browser'

type Player = { id: string; name: string }
const SEATS = ['东', '南', '西', '北']

export default function AddGamePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState('')
  const [scores, setScores] = useState(['', '', '', ''])
  const total = useMemo(() => scores.reduce((sum, s) => sum + (s === '' ? 0 : Number(s)), 0), [scores])
  const diff = 100000 - total
  const totalOK = scores.every((s) => s !== '' && Number.isFinite(Number(s))) && total === 100000

  async function loadPlayers() {
    try {
      const res = await fetch('/api/players', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) return setMessage(data.error ?? '读取玩家失败')
      setPlayers(data.players ?? [])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '读取玩家失败')
    }
  }

  useEffect(() => { loadPlayers() }, [])

  async function addGame(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    if (!totalOK) return setMessage(`四家终局点数必须合计 100000，目前为 ${total}`)

    const auth = await getOwnerAuthHeader()
    if (!auth) return setMessage('请先通过邮箱验证码登录管理员账号。')

    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/games', { method: 'POST', headers: auth, body: form })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) return setMessage(data.error ?? '保存失败')
      window.location.href = '/games'
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <main>
      <h1>录入对局</h1>
      <p className="muted">
        录入对局需要管理员邮箱验证。<Link href="/login">管理员登录</Link>
      </p>

      {message && <div className="card">{message}</div>}

      <div className="card">
        <h2>四麻半庄结果</h2>
        <p className="muted">M.LEAGUE：25000 起点 / 30000 返还 / 順位点 +50,+10,-10,-30；同点平分所占順位点。</p>
        <form onSubmit={addGame}>
          {[0, 1, 2, 3].map((i) => (
            <div className="grid" style={{ marginBottom: 10 }} key={i}>
              <select name={`player${i}`} required defaultValue="">
                <option value="" disabled>{SEATS[i]} · 选择玩家</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                name={`score${i}`}
                type="number"
                step="100"
                placeholder={`${SEATS[i]}家终局点数`}
                value={scores[i]}
                onChange={(e) => setScores((prev) => prev.map((v, j) => j === i ? e.target.value : v))}
                required
              />
            </div>
          ))}

          <div className="card" style={{ margin: '12px 0' }}>
            <b>当前合计：{total.toLocaleString()} / 100,000</b>
            <div className="muted" style={{ marginTop: 6 }}>
              {totalOK ? '✓ 总分正确，可以保存' : diff > 0 ? `还差 ${diff.toLocaleString()} 点` : `多出 ${Math.abs(diff).toLocaleString()} 点`}
            </div>
          </div>

          <button type="submit" disabled={!totalOK} style={{ opacity: totalOK ? 1 : 0.5 }}>保存这一场</button>
        </form>
      </div>
    </main>
  )
}
