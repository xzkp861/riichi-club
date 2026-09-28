import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOwner } from '@/lib/owner-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: '玩家名不能为空' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('players').update({ name }).eq('id', id)
    if (error) return NextResponse.json({ error: error.code === '23505' ? '这个玩家名已经存在' : error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '修改失败' }, { status: 500 })
  }
}
