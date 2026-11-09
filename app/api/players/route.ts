import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadRankingPlayers } from '@/lib/ranking-players'

export async function GET() {
  try {
    const result = await loadRankingPlayers(createAdminClient())
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '读取玩家或参榜设置失败，请重试' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const expectedPin = process.env.ADMIN_PIN
    if (!expectedPin) return NextResponse.json({ error: '管理员 PIN 尚未配置' }, { status: 503 })
    const form = await request.formData()
    if (String(form.get('pin') ?? '') !== expectedPin) {
      return NextResponse.json({ error: '管理员 PIN 错误' }, { status: 401 })
    }
    const name = String(form.get('name') ?? '').trim()
    if (!name) return NextResponse.json({ error: '请输入玩家名' }, { status: 400 })
    const { error } = await createAdminClient().from('players').insert({ name })
    if (error) return NextResponse.json({ error: error.code === '23505' ? '这个玩家名已经存在' : '添加玩家失败' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '添加失败' }, { status: 500 })
  }
}
