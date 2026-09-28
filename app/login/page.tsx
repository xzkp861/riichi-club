'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { browserSupabase } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    const { error } = await browserSupabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })

    setBusy(false)
    if (error) return setMessage(error.message)

    setSent(true)
    setMessage('验证码已发送，请检查邮箱。')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    const { error } = await browserSupabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setBusy(false)
      return setMessage(error.message)
    }

    const { data: { session } } = await browserSupabase.auth.getSession()
    if (!session?.access_token) {
      setBusy(false)
      return setMessage('登录状态建立失败，请重试。')
    }

    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
    const data = await res.json()

    if (!res.ok) {
      await browserSupabase.auth.signOut()
      setBusy(false)
      return setMessage(data.error ?? '当前邮箱没有管理员权限')
    }

    router.push('/manage')
    router.refresh()
  }

  async function signOut() {
    await browserSupabase.auth.signOut()
    setSent(false)
    setCode('')
    setMessage('已退出登录。')
  }

  return (
    <main style={{ maxWidth: 560 }}>
      <p><Link href="/">← 返回首页</Link></p>
      <h1>管理员登录</h1>
      <p className="muted">使用管理员邮箱的一次性验证码登录，不再使用固定 PIN。</p>

      {message && <div className="card">{message}</div>}

      <div className="card">
        {!sent ? (
          <form onSubmit={sendCode}>
            <label>
              邮箱
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="管理员邮箱"
                required
                autoComplete="email"
                style={{ marginTop: 8, marginBottom: 14 }}
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? '发送中...' : '发送验证码'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <p className="muted">验证码已发送至 {email}</p>
            <label>
              6 位验证码
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                minLength={6}
                maxLength={6}
                style={{ marginTop: 8, marginBottom: 14 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" disabled={busy || code.length !== 6}>
                {busy ? '验证中...' : '验证并登录'}
              </button>
              <button type="button" onClick={() => { setSent(false); setCode(''); setMessage('') }}>
                更换邮箱
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="muted" style={{ marginTop: 18 }}>
        如果你已经登录，也可以直接进入管理页面。需要切换账号时可先退出。
      </p>
      <button type="button" onClick={signOut}>退出当前登录</button>
    </main>
  )
}
