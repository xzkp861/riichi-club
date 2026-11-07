import Link from 'next/link'
import { loadClubData } from '@/lib/club-data'
import { danLabel, danProgress } from '@/lib/dan'
import GameCard from '@/components/GameCard'

export const dynamic = 'force-dynamic'
type SortKey = 'dan' | 'rate' | 'games' | 'avgRank' | 'firstRate' | 'fourthRate'
type SortDir = 'asc' | 'desc'
const DIRECTIONS: Record<SortKey, SortDir> = { dan: 'desc', rate: 'desc', games: 'desc', avgRank: 'asc', firstRate: 'desc', fourthRate: 'asc' }

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  const params = await searchParams
  const hasSort = Object.hasOwn(DIRECTIONS, params.sort ?? '')
  const sort: SortKey = hasSort ? params.sort as SortKey : 'dan'
  const dir: SortDir = hasSort && (params.dir === 'asc' || params.dir === 'desc') ? params.dir : DIRECTIONS[sort]
  let club: Awaited<ReturnType<typeof loadClubData>>
  try { club = await loadClubData() } catch {
    return <main><h1>段位排行榜</h1><div className="card" role="alert">暂时无法读取完整战绩，段位判定已暂停。请刷新重试；若持续出现，请管理员检查数据库连接和是否有不完整对局。</div><Link href="/games">查看历史对局 →</Link></main>
  }
  const stats = new Map(club.players.map(player => [player.id, { ...player, games: 0, rankSum: 0, firsts: 0, fourths: 0 }]))
  for (const game of club.games) for (const row of game.game_results) {
    const item = stats.get(row.player_id)
    if (!item) continue
    item.games += 1; item.rankSum += Number(row.rank)
    if (row.rank === 1) item.firsts += 1
    if (row.rank === 4) item.fourths += 1
  }
  const rows = [...stats.values()].map(item => {
    const state = club.standings.get(item.id)!
    const rating = club.latestRatings.get(item.id)
    // Do not present an initial 1500 as a real rating when historical rebuilding is missing.
    const rate = !item.games ? 1500 : rating && Number(rating.games_before) + 1 === item.games ? Number(rating.rating_after) : null
    return { ...item, dan: state.dan, progress: danProgress(state), rate,
      avgRank: item.games ? item.rankSum / item.games : null,
      firstRate: item.games ? item.firsts / item.games : null,
      fourthRate: item.games ? item.fourths / item.games : null }
  })
  rows.sort((a, b) => {
    const av = a[sort], bv = b[sort]
    if (av === null || bv === null) { if (av !== bv) return av === null ? 1 : -1 }
    else if (av !== bv) return dir === 'asc' ? av - bv : bv - av
    return (b.rate ?? -Infinity) - (a.rate ?? -Infinity) || a.id.localeCompare(b.id)
  })
  const heading = (label: string, key: SortKey) => <Link scroll={false} href={`/?sort=${key}&dir=${sort === key ? dir === 'desc' ? 'asc' : 'desc' : DIRECTIONS[key]}`}>{label}{sort === key ? dir === 'desc' ? ' ↓' : ' ↑' : ''}</Link>
  return <main>
    <h1>段位排行榜</h1>
    <p className="muted">全员初段起步。默认按段位排序，同段按 Rate 排序；点击统计表头可切换排序。</p>
    <p><Link href="/dan">查看晋级条件与同点规则 →</Link></p>
    <div className="card" style={{ overflowX: 'auto' }}>
      {!rows.length ? <p className="muted">还没有玩家。添加玩家后即以初段显示。</p> : <table>
        <thead><tr><th>序号</th><th>玩家</th><th>{heading('段位', 'dan')}</th><th>晋级考核</th><th>{heading('Rate', 'rate')}</th><th>{heading('场次', 'games')}</th><th>{heading('均顺', 'avgRank')}</th><th>{heading('一位率', 'firstRate')}</th><th>{heading('四位率', 'fourthRate')}</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id}>
          <td>{index + 1}</td><td><Link href={`/players/${row.id}`}><strong>{row.name}</strong></Link></td>
          <td style={{ whiteSpace: 'nowrap' }}><strong>{danLabel(row.dan)}</strong></td>
          <td style={{ minWidth: 175 }}><Link href={`/players/${row.id}#dan-progress`}>
            {row.progress.rule ? <>{row.progress.count}/{row.progress.rule.windowSize} 场 → {danLabel(row.progress.rule.to)}<br /><small className="muted">{row.progress.remaining ? '暂定' : '窗口'}均顺 {row.progress.average?.toFixed(3) ?? '—'} / ≤ {(row.progress.rule.averageTenths / 10).toFixed(2)}</small></> : '已达最高段位'}
          </Link></td>
          <td>{row.rate?.toFixed(1) ?? '待重算'}</td><td>{row.games}</td>
          <td>{row.avgRank?.toFixed(2) ?? '—'}</td><td>{row.firstRate === null ? '—' : `${(row.firstRate * 100).toFixed(1)}%`}</td>
          <td>{row.fourthRate === null ? '—' : `${(row.fourthRate * 100).toFixed(1)}%`}</td>
        </tr>)}</tbody>
      </table>}
    </div>
    <p className="muted">“考核均顺”同点取占据名次的平均值；原“均顺”和一位率等统计仍按历史记录的并列名次计算。未打过对局的玩家显示初段。</p>
    <h2 style={{ marginTop: 32 }}>最近 4 场对局</h2>
    {[...club.games].reverse().slice(0, 4).map(game => <GameCard key={game.id} game={game} players={club.playerById} ratingByGamePlayer={club.ratingByGamePlayer} />)}
    <p><Link href="/games">查看全部历史对局 →</Link></p>
  </main>
}
