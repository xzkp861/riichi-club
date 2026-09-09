import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('players').select('id,name').order('name')
    if (error) throw error
    return NextResponse.json({ players: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '读取玩家失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    if (String(form.get('pin') ?? '') !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: '管理员 PIN 错误' }, { status: 401 })
    }
    const name = String(form.get('name') ?? '').trim()
    if (!name) return NextResponse.json({ error: '请输入玩家名' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('players').insert({ name })
    if (error) return NextResponse.json({ error: error.code === '23505' ? '这个玩家名已经存在' : error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '添加失败' }, { status: 500 })
  }
}
