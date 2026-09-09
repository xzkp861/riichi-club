'use client'

import { useEffect, useState } from 'react'

type Player = { id: string; name: string }

export default function ManagePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/players', { cache: 'no-store' })
    const data = await res.json()
    setPlayers(data.players ?? [])
  }
  useEffect(() => { load() }, [])

  async function renamePlayer(id: string, currentName: string) {
    const name = window.prompt('新的玩家名', currentName)?.trim()
    if (!name || name === currentName) return
    const res = await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    const data = await res.json()
    if (!res.ok) return setMessage(data.error ?? '修改失败')
    setMessage('名称已修改；历史对局会自动显示新名称。')
    await load()
  }

  return (
    <main>
      <h1>管理</h1>
      {message && <div className="card">{message}</div>}
      <div className="card">
        <h2>玩家管理</h2>
        <input type="password" placeholder="管理员 PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 16 }} />
        <table>
          <thead><tr><th>玩家</th><th>操作</th></tr></thead>
          <tbody>{players.map((p) => (
            <tr key={p.id}><td>{p.name}</td><td><button onClick={() => renamePlayer(p.id, p.name)}>修改姓名</button></td></tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  )
}
