import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMissingRankingColumn, parsePlayerSettings } from '@/lib/player-settings'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const expectedPin = process.env.ADMIN_PIN
    if (!expectedPin) return NextResponse.json({ error: '管理员 PIN 尚未配置' }, { status: 503 })
    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    if (typeof input.pin !== 'string' || input.pin !== expectedPin) {
      return NextResponse.json({ error: '管理员 PIN 错误' }, { status: 401 })
    }
    const { id } = await params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: '玩家 ID 格式错误' }, { status: 400 })
    }
    let patch: ReturnType<typeof parsePlayerSettings>
    try { patch = parsePlayerSettings(input) } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '设置格式错误' }, { status: 400 })
    }
    const { data, error } = await createAdminClient().from('players')
      .update(patch).eq('id', id).select('id').maybeSingle()
    if (error) {
      if (isMissingRankingColumn(error)) return NextResponse.json({
        error: '参榜设置尚未初始化，请先执行 003_ranking_visibility.sql', code: 'RANKING_MIGRATION_REQUIRED',
      }, { status: 503 })
      return NextResponse.json({ error: error.code === '23505' ? '这个玩家名已经存在' : '保存设置失败，请重试' }, { status: 400 })
    }
    if (!data) return NextResponse.json({ error: '玩家不存在，请刷新列表' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '修改失败，请重试' }, { status: 500 })
  }
}
