'use client'

import Link from 'next/link'
import { useState } from 'react'

type Player = { id: string; name: string }

export default function PlayerDirectory({ players }: { players: Player[] }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = players.filter(player => player.name.toLowerCase().includes(needle))

  if (!players.length) return <div className="card"><p className="muted">还没有玩家。</p></div>

  return <section aria-label="玩家列表">
    <div style={{ marginBottom: 20 }}>
      <label htmlFor="player-search">查找玩家</label>
      <input id="player-search" type="search" value={query}
        onChange={event => setQuery(event.target.value)} placeholder="输入玩家姓名"
        autoComplete="off" style={{ marginTop: 8 }} />
    </div>
    <p className="muted" role="status">{visible.length} 位玩家</p>
    {!visible.length ? <div className="card">没有找到匹配的玩家，请换个名字试试。</div> : (
      <div className="grid">
        {visible.map(player => <Link key={player.id} className="card"
          href={`/players/${player.id}`} aria-label={`查看 ${player.name} 的个人主页`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 0 }}>
          <strong style={{ overflowWrap: 'anywhere' }}>{player.name}</strong>
          <span className="muted" style={{ whiteSpace: 'nowrap' }}>查看主页 →</span>
        </Link>)}
      </div>
    )}
  </section>
}
