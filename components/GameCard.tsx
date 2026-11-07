import Link from 'next/link'
import type { ClubGame, ClubPlayer } from '@/lib/club-data'

export default function GameCard({ game, players }: { game: ClubGame; players: Map<string, ClubPlayer> }) {
  return <section className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <strong>{new Date(game.played_at).toLocaleDateString('zh-CN')}</strong><Link href={`/games#${game.id}`}>查看本场</Link>
    </div>
    <div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>顺位</th><th>玩家</th><th>终局点数</th><th>PT</th></tr></thead>
      <tbody>{[...game.game_results].sort((a, b) => a.rank - b.rank || a.seat - b.seat).map(row => <tr key={row.id}>
        <td>{row.rank}</td><td><Link href={`/players/${row.player_id}`}>{players.get(row.player_id)?.name ?? '未知玩家'}</Link></td>
        <td>{row.raw_score.toLocaleString()}</td><td>{row.final_score > 0 ? '+' : ''}{Number(row.final_score).toFixed(1)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>
}
