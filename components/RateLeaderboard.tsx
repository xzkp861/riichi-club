'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DEFAULT_SORT, SORT_DIRECTIONS, sortLeaderboard, type LeaderboardRow, type LeaderboardSortKey, type SortDirection } from '@/lib/leaderboard'

const percentage = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`
const pt = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}`
const mutedCell = { color: '#8a8f8b', background: '#f4f5f3' }

export default function RateLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<LeaderboardSortKey>(DEFAULT_SORT)
  const [direction, setDirection] = useState<SortDirection>(SORT_DIRECTIONS[DEFAULT_SORT])
  const ordered = sortLeaderboard(rows, sort, direction)
  const matches = ordered.filter(row => row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))

  function changeSort(key: LeaderboardSortKey) {
    setDirection(sort === key ? direction === 'desc' ? 'asc' : 'desc' : SORT_DIRECTIONS[key])
    setSort(key)
  }
  const heading = (label: string, key: LeaderboardSortKey) => (
    <th aria-sort={sort === key ? direction === 'desc' ? 'descending' : 'ascending' : 'none'}>
      <button type="button" onClick={() => changeSort(key)}
        style={{ background: 'transparent', color: 'inherit', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
        title={`按${label}排序，再次点击切换升降序`}>
        {label}{sort === key ? direction === 'desc' ? ' ↓' : ' ↑' : ''}
      </button>
    </th>
  )

  return <section className="card">
    <label htmlFor="player-search" className="muted">查找玩家</label>
    <input id="player-search" type="search" placeholder="输入玩家名" value={query}
      onChange={event => setQuery(event.target.value)} style={{ margin: '8px 0 18px' }} />
    {!matches.length ? <p className="muted">{rows.length ? '没有匹配的玩家。' : '还没有玩家。'}</p> :
      <div style={{ overflowX: 'auto' }}><table style={{ minWidth: 840 }}>
        <thead><tr><th>排名</th><th>玩家</th>{heading('近30场 PT', 'recentPt')}{heading('总 PT', 'totalPt')}{heading('Rate（生涯）', 'rate')}{heading('总场数', 'totalGames')}{heading('近30场均顺', 'avgRank')}{heading('近30场一位率', 'firstRate')}{heading('近30场四位率', 'fourthRate')}</tr></thead>
        <tbody>{matches.map(row => row.excluded ? (
          <tr key={row.id}>
            <td style={mutedCell}>—</td>
            <td><Link href={`/players/${row.id}`}><strong>{row.name}</strong></Link><br /><small className="muted">不参与排名</small></td>
            {[0, 1, 2, 3, 4, 5, 6].map(column => <td key={column} style={mutedCell} aria-label="不参榜，不展示数据">—</td>)}
          </tr>
        ) : (
          <tr key={row.id}>
            <td>{row.position ?? '—'}</td>
            <td><Link href={`/players/${row.id}`}><strong>{row.name}</strong></Link>
              {row.status !== 'ranked' && <><br /><small className="muted">{row.status === 'no-games' ? '尚无对局' : 'Rate 待重算'}</small></>}
            </td>
            <td><strong>{pt(row.recentPt)}</strong></td>
            <td>{pt(row.totalPt)}</td>
            <td><strong>{row.rate?.toFixed(2) ?? '—'}</strong></td>
            <td>{row.totalGames}</td>
            <td>{row.avgRank?.toFixed(2) ?? '—'}</td>
            <td>{percentage(row.firstRate)}</td>
            <td>{percentage(row.fourthRate)}</td>
          </tr>
        ))}</tbody>
      </table></div>}
    <p className="muted" style={{ marginBottom: 0 }}>默认按近30场 PT 总和降序排列，点击表头可切换排序。相同数值并列名次；搜索不会改变原有名次。不参榜玩家始终按姓名置于最下方，姓名仍可点击。</p>
  </section>
}
