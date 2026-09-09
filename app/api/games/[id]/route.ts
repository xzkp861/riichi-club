import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFinalScores } from '@/lib/scoring'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { data: game, error } = await supabase
      .from('games')
      .select('id,played_at,game_results(id,player_id,seat,raw_score,rank,final_score,players(name))')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    const { data: players } = await supabase.from('players').select('id,name').order('name')
    return NextResponse.json({ game, players: players ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '读取失败' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (String(body.pin ?? '') !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: '管理员 PIN 错误' }, { status: 401 })
    }

    const playerIds = Array.isArray(body.playerIds) ? body.playerIds.map(String) : []
    const scores = Array.isArray(body.scores) ? body.scores.map(Number) : []
    if (playerIds.length !== 4 || new Set(playerIds).size !== 4 || playerIds.some((x: string) => !x)) {
      return NextResponse.json({ error: '请选择四位不同的玩家' }, { status: 400 })
    }
    const { ranks, finalScores } = calculateFinalScores(scores)

    const supabase = createAdminClient()
    const { data: oldResults, error: oldError } = await supabase
      .from('game_results').select('player_id,seat,raw_score,rank,final_score').eq('game_id', id)
    if (oldError) throw oldError

    const { error: deleteError } = await supabase.from('game_results').delete().eq('game_id', id)
    if (deleteError) throw deleteError

    const newResults = playerIds.map((player_id: string, i: number) => ({
      game_id: id,
      player_id,
      seat: i + 1,
      raw_score: scores[i],
      rank: ranks[i],
      final_score: finalScores[i],
    }))
    const { error: insertError } = await supabase.from('game_results').insert(newResults)
    if (insertError) {
      if (oldResults?.length) {
        await supabase.from('game_results').insert(oldResults.map((r) => ({ ...r, game_id: id })))
      }
      throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '修改失败' }, { status: 500 })
  }
}
