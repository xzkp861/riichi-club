import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase.from('games')
      .select('id,played_at,game_results(id,seat,rank,raw_score,final_score,player_id,players(name))')
      .order('played_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ games: (data ?? []).map(game => ({
      ...game, game_results: [...game.game_results].sort((a, b) => a.rank - b.rank || a.seat - b.seat),
    })) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '读取历史对局失败' }, { status: 500 })
  }
}
