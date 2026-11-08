import PlayerDirectory from '@/components/PlayerDirectory'
import { createPublicClient } from '@/lib/supabase/public'
import { readAllPages, type ClubPlayer } from '@/lib/club-data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let players: ClubPlayer[]
  try {
    const db = createPublicClient()
    players = await readAllPages<ClubPlayer>((from, to) => db.from('players')
      .select('id,name', { count: 'exact' }).order('name').order('id').range(from, to))
  } catch {
    return <main><h1>玩家主页</h1><div className="card" role="alert">暂时无法读取玩家列表，请刷新重试。</div></main>
  }

  return <main>
    <h1>玩家主页</h1>
    <p className="muted">选择玩家查看个人战绩，玩家按姓名排列。</p>
    <PlayerDirectory players={players} />
  </main>
}
