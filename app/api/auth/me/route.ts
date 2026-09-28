import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/owner-auth'

export async function GET(request: Request) {
  const auth = await requireOwner(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  return NextResponse.json({ authenticated: true, email: auth.email })
}
