import { NextResponse } from 'next/server'
import { recalculateRatings } from '@/lib/rating'
import { requireOwner } from '@/lib/owner-auth'

export async function POST(request: Request) {
  try {
    const auth = await requireOwner(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await recalculateRatings()
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Rate 重算失败' },
      { status: 500 }
    )
  }
}
