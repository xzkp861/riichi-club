import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFinalScores } from '@/lib/scoring'

export async function POST(request: Request) {
  let createdGameId: string | null = null
  try {
    const form = await request.formData()
    if (String(form.get('pin') ?? '') !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: '管理员 PIN 错误' }, { status: 401 })
    }

    const playerIds = [0,1,2,3].map((i) => String(form.get(`player${i}`) ?? ''))
    const scores = [0,1,2,3].map((i) => Number(form.get(`score${i}`)))
    if (new Set(playerIds).size !== 4 || playerIds.some((x) => !x)) {
      return NextResponse.json({ error: '请选择四位不同的玩家' }, { status: 400 })
    }

    const { ranks, finalScores } = calculateFinalScores(scores)
    const supabase = createAdminClient()
    const { data: game, error: gameError } = await supabase.from('games').insert({ played_at: new Date().toISOString() }).select('id').single()
    if (gameError) throw gameError
    createdGameId = game.id

    const results = playerIds.map((player_id, i) => ({
      game_id: game.id,
      player_id,
      seat: i + 1,
      raw_score: scores[i],
      rank: ranks[i],
      final_score: finalScores[i],
    }))
    const { error: resultError } = await supabase.from('game_results').insert(results)
    if (resultError) throw resultError
    return NextResponse.json({ success: true, gameId: game.id })
  } catch (e) {
    if (createdGameId) {
      try { await createAdminClient().from('games').delete().eq('id', createdGameId) } catch {}
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : '保存失败' }, { status: 500 })
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (String(body.pin ?? '') !== process.env.ADMIN_PIN) {
      return NextResponse.json(
        { error: '管理员 PIN 错误' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    const { error: resultError } = await supabase
      .from('game_results')
      .delete()
      .eq('game_id', id)

    if (resultError) throw resultError

    const { error: gameError } = await supabase
      .from('games')
      .delete()
      .eq('id', id)

    if (gameError) throw gameError

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : '删除失败',
      },
      { status: 500 }
    )
  }
}