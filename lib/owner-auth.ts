import { createAdminClient } from '@/lib/supabase/admin'

type AuthResult =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string }

export async function requireOwner(request: Request): Promise<AuthResult> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase()
  if (!ownerEmail) {
    return { ok: false, status: 500, error: 'OWNER_EMAIL 尚未配置' }
  }

  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: '请先通过邮箱验证码登录' }
  }

  const token = authorization.slice('Bearer '.length).trim()
  if (!token) {
    return { ok: false, status: 401, error: '登录状态无效，请重新登录' }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  const email = data.user?.email?.trim().toLowerCase()

  if (error || !email) {
    return { ok: false, status: 401, error: '登录已失效，请重新登录' }
  }

  if (email !== ownerEmail) {
    return { ok: false, status: 403, error: '当前邮箱没有管理员权限' }
  }

  return { ok: true, email }
}
