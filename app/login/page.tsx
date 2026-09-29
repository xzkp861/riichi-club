'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { browserSupabase } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let active = true

    async function finishLogin() {
      const { data: { session } } = await browserSupabase.auth.getSession()
      if (!active || !session?.access_token) return

      setBusy(true)
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })
      const data = await res.json()

      if (!active) return

      if (!res.ok) {
        await browserSupabase.auth.signOut()
        setBusy(false)
        setMessage(data.error ?? '当前邮箱没有管理员权限')
        return
      }

      router.replace('/manage')
      router.refresh()
    }

    finishLogin()

    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((_event, session) => {
      if (session) finishLogin()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    const redirectTo = `${window.location.origin}/login`
    const { error } = await browserSupabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    })

    setBusy(false)
    if (error) return setMessage(error.message)

    setSent(true)
    setMessage('登录链接已发送，请打开邮箱并点击 Sign in。')
  }

  async function signOut() {
    await browserSupabase.auth.signOut()
    setSent(false)
    setMessage('已退出登录。')
  }

  return (
    <main style={{ maxWidth: 560 }}>
      <p><Link href="/">← 返回首页</Link></p>
      <h1>管理员登录</h1>
      <p className="muted">使用管理员邮箱的 Magic Link 登录，不再使用固定 PIN。</p>

      {message && <div className="card">{message}</div>}

      <div className="card">
        <form onSubmit={sendLink}>
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

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={busy}>
              {busy ? '处理中...' : sent ? '重新发送登录链接' : '发送登录链接'}
            </button>
            {sent && (
              <button
                type="button"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                  setMessage('')
                }}
              >
                更换邮箱
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="muted" style={{ marginTop: 18 }}>
        点击邮件里的 Sign in 后会自动返回 BOS RIICHI，并进入管理页面。
      </p>
      <button type="button" onClick={signOut}>退出当前登录</button>
    </main>
  )
}
