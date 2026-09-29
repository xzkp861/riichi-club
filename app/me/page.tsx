'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { browserSupabase } from '@/lib/supabase/browser'

export default function PersonalCenterPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const { data: { session } } = await browserSupabase.auth.getSession()
      if (!active) return

      if (!session?.access_token) {
        setLoading(false)
        return
      }

      setEmail(session.user.email ?? null)

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })

      if (!active) return

      setIsOwner(res.ok)
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [])

  async function signOut() {
    await browserSupabase.auth.signOut()
    setEmail(null)
    setIsOwner(false)
    setMessage('已退出登录。')
  }

  return (
    <main style={{ maxWidth: 760 }}>
      <h1>个人中心</h1>

      {message && <div className="card">{message}</div>}

      {loading ? (
        <div className="card">正在读取登录状态...</div>
      ) : !email ? (
        <div className="card">
          <h2>尚未登录</h2>
          <p className="muted">登录管理员邮箱后，可以录入、修改和管理 BOS RIICHI 数据。</p>
          <Link href="/login">管理员登录 →</Link>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="muted">当前账号</div>
            <h2 style={{ marginBottom: 8 }}>{email}</h2>
            <p className="muted">{isOwner ? '最高权限管理员' : '已登录，但当前邮箱没有管理员权限'}</p>
          </div>

          {isOwner && (
            <div className="grid">
              <div className="card">
                <h2>录入对局</h2>
                <p className="muted">添加新的半庄结果并自动更新排行榜与 Rate。</p>
                <Link href="/add-game">去录入 →</Link>
              </div>
              <div className="card">
                <h2>玩家管理</h2>
                <p className="muted">添加玩家、修改玩家名称。</p>
                <Link href="/manage">去管理 →</Link>
              </div>
            </div>
          )}

          <button type="button" onClick={signOut} style={{ marginTop: 8 }}>退出登录</button>
        </>
      )}
    </main>
  )
}
