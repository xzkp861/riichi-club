'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { LeaderboardRow } from '@/lib/leaderboard'

const percentage = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`
const mutedCell = { color: '#8a8f8b', background: '#f4f5f3' }

export default function RateLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const [query, setQuery] = useState('')
  const matches = rows.filter(row => row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section className="card">
    <label htmlFor="player-search" className="muted">查找玩家</label>
    <input id="player-search" type="search" placeholder="输入玩家名" value={query}
      onChange={event => setQuery(event.target.value)} style={{ margin: '8px 0 18px' }} />
    {!matches.length ? <p className="muted">{rows.length ? '没有匹配的玩家。' : '还没有玩家。'}</p> :
      <div style={{ overflowX: 'auto' }}><table style={{ minWidth: 650 }}>
        <thead><tr><th>排名</th><th>玩家</th><th>Rate（生涯）</th><th>统计场数</th><th>近30场均顺</th><th>近30场一位率</th><th>近30场四位率</th></tr></thead>
        <tbody>{matches.map(row => row.excluded ? (
          <tr key={row.id}>
            <td style={mutedCell}>—</td>
            <td><Link href={`/players/${row.id}`}><strong>{row.name}</strong></Link><br /><small className="muted">不参与排名</small></td>
            {[0, 1, 2, 3, 4].map(column => <td key={column} style={mutedCell} aria-label="不参榜，不展示数据">—</td>)}
          </tr>
        ) : (
          <tr key={row.id}>
            <td>{row.position ?? '—'}</td>
            <td><Link href={`/players/${row.id}`}><strong>{row.name}</strong></Link>
              {row.status !== 'ranked' && <><br /><small className="muted">{row.status === 'no-games' ? '尚无对局' : 'Rate 待重算'}</small></>}
            </td>
            <td><strong>{row.rate?.toFixed(2) ?? '—'}</strong></td>
            <td>{row.recentGames} / 30</td>
            <td>{row.avgRank?.toFixed(2) ?? '—'}</td>
            <td>{percentage(row.firstRate)}</td>
            <td>{percentage(row.fourthRate)}</td>
          </tr>
        ))}</tbody>
      </table></div>}
    <p className="muted" style={{ marginBottom: 0 }}>点击姓名进入个人主页。搜索不会改变原有名次；不参榜玩家按姓名置于最下方。</p>
  </section>
}
