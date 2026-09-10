import { NextResponse } from 'next/server'
import { recalculateRatings } from '@/lib/rating'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (String(body.pin ?? '') !== process.env.ADMIN_PIN) {
      return NextResponse.json(
        { error: '管理员 PIN 错误' },
        { status: 401 }
      )
    }

    await recalculateRatings()

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Rate 重算失败',
      },
      { status: 500 }
    )
  }
}
