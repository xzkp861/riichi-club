import Link from 'next/link'
import type { ClubGame, ClubPlayer, ClubRating } from '@/lib/club-data'

export default function GameCard({ game, players, ratingByGamePlayer }: {
  game: ClubGame
  players: Map<string, ClubPlayer>
  ratingByGamePlayer: Map<string, ClubRating>
}) {
  return <section className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <strong>{new Date(game.played_at).toLocaleDateString('zh-CN')}</strong><Link href={`/games#${game.id}`}>查看本场</Link>
    </div>
    <div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>顺位</th><th>玩家</th><th>终局点数</th><th>Rate变化</th></tr></thead>
      <tbody>{[...game.game_results].sort((a, b) => a.rank - b.rank || a.seat - b.seat).map(row => {
        const rating = ratingByGamePlayer.get(`${game.id}:${row.player_id}`)
        const change = rating ? Number(rating.rating_change) : null
        return <tr key={row.id}>
          <td>{row.rank}</td><td><Link href={`/players/${row.player_id}`}>{players.get(row.player_id)?.name ?? '未知玩家'}</Link></td>
          <td>{row.raw_score.toLocaleString()}</td><td>{change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)}`}</td>
        </tr>
      })}</tbody>
    </table></div>
  </section>
}
