import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import { INITIAL_RATING } from '@/lib/rating'

export const dynamic = 'force-dynamic'

type SortKey = 'pt' | 'rate' | 'games' | 'avgRank' | 'firstRate' | 'fourthRate' | 'avgPt'
type SortDir = 'asc' | 'desc'

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  pt: 'desc',
  rate: 'desc',
  games: 'desc',
  avgRank: 'asc',
  firstRate: 'desc',
  fourthRate: 'asc',
  avgPt: 'desc',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const params = await searchParams
  const allowedSorts: SortKey[] = ['pt', 'rate', 'games', 'avgRank', 'firstRate', 'fourthRate', 'avgPt']
  const sort: SortKey = allowedSorts.includes(params.sort as SortKey) ? (params.sort as SortKey) : 'pt'
  const dir: SortDir = params.dir === 'asc' || params.dir === 'desc' ? params.dir : DEFAULT_DIR[sort]

  const supabase = createPublicClient()

  const [{ data: results }, { data: ratingHistory }] = await Promise.all([
    supabase
      .from('game_results')
      .select(`
        player_id,
        rank,
        final_score,
        players (
          id,
          name
        )
      `),
    supabase
      .from('rating_history')
      .select('player_id,rating_after,games_before')
      .order('games_before', { ascending: true }),
  ])

  const latestRatings = new Map<string, { rating: number; gamesBefore: number }>()
  for (const row of ratingHistory ?? []) {
    const gamesBefore = Number(row.games_before)
    const current = latestRatings.get(row.player_id)
    if (!current || gamesBefore >= current.gamesBefore) {
      latestRatings.set(row.player_id, {
        rating: Number(row.rating_after),
        gamesBefore,
      })
    }
  }

  const stats = new Map<
    string,
    {
      id: string
      name: string
      games: number
      rankSum: number
      firsts: number
      fourths: number
      ptSum: number
    }
  >()

  for (const r of results ?? []) {
    const player = Array.isArray(r.players) ? r.players[0] : r.players
    if (!player) continue

    if (!stats.has(player.id)) {
      stats.set(player.id, {
        id: player.id,
        name: player.name,
        games: 0,
        rankSum: 0,
        firsts: 0,
        fourths: 0,
        ptSum: 0,
      })
    }

    const s = stats.get(player.id)!
    s.games += 1
    s.rankSum += Number(r.rank)
    if (Number(r.rank) === 1) s.firsts += 1
    if (Number(r.rank) === 4) s.fourths += 1
    s.ptSum += Number(r.final_score)
  }

  const leaderboard = [...stats.values()].map((s) => ({
    ...s,
    rate: latestRatings.get(s.id)?.rating ?? INITIAL_RATING,
    avgRank: s.games ? s.rankSum / s.games : 0,
    firstRate: s.games ? s.firsts / s.games : 0,
    fourthRate: s.games ? s.fourths / s.games : 0,
    avgPt: s.games ? s.ptSum / s.games : 0,
  }))

  const valueFor = (p: (typeof leaderboard)[number], key: SortKey) => {
    switch (key) {
      case 'pt': return p.ptSum
      case 'rate': return p.rate
      case 'games': return p.games
      case 'avgRank': return p.avgRank
      case 'firstRate': return p.firstRate
      case 'fourthRate': return p.fourthRate
      case 'avgPt': return p.avgPt
    }
  }

  leaderboard.sort((a, b) => {
    const diff = valueFor(a, sort) - valueFor(b, sort)
    if (diff !== 0) return dir === 'asc' ? diff : -diff
    return b.ptSum - a.ptSum
  })

  const formatPt = (value: number) => value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)

  const sortHref = (key: SortKey) => {
    const nextDir: SortDir = sort === key
      ? (dir === 'desc' ? 'asc' : 'desc')
      : DEFAULT_DIR[key]
    return `/?sort=${key}&dir=${nextDir}`
  }

  const sortLabel = (label: string, key: SortKey) => (
    <Link href={sortHref(key)} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {label}
      {sort === key ? (dir === 'desc' ? '↓' : '↑') : ''}
    </Link>
  )

  return (
    <main>
      <h1>排行榜</h1>
      <p className="muted">点击任意统计列标题即可排序；再次点击可切换升序 / 降序。点击玩家查看个人主页。</p>

      <div className="card" style={{ overflowX: 'auto' }}>
        {leaderboard.length === 0 ? (
          <p className="muted">还没有对局数据。先添加玩家并录入第一场。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>玩家</th>
                <th>{sortLabel('PT', 'pt')}</th>
                <th>{sortLabel('Rate', 'rate')}</th>
                <th>{sortLabel('场次', 'games')}</th>
                <th>{sortLabel('均顺', 'avgRank')}</th>
                <th>{sortLabel('一位率', 'firstRate')}</th>
                <th>{sortLabel('四位率', 'fourthRate')}</th>
                <th>{sortLabel('平均 PT', 'avgPt')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p, index) => (
                <tr key={p.id}>
                  <td>{index + 1}</td>
                  <td><Link href={`/players/${p.id}`}><strong>{p.name}</strong></Link></td>
                  <td><strong>{formatPt(p.ptSum)}</strong></td>
                  <td><strong>{p.rate.toFixed(1)}</strong></td>
                  <td>{p.games}</td>
                  <td>{p.avgRank.toFixed(2)}</td>
                  <td>{(p.firstRate * 100).toFixed(1)}%</td>
                  <td>{(p.fourthRate * 100).toFixed(1)}%</td>
                  <td>{formatPt(p.avgPt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ marginTop: 32 }}>最近对局</h2>
      <p><Link href="/games">查看全部历史对局 →</Link></p>
    </main>
  )
}
