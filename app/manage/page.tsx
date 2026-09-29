'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getOwnerAuthHeader } from '@/lib/supabase/browser'

type Player = { id: string; name: string }

export default function ManagePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/players', { cache: 'no-store' })
    const data = await res.json()
    setPlayers(data.players ?? [])
  }

  useEffect(() => { load() }, [])

  async function addPlayer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    const auth = await getOwnerAuthHeader()
    if (!auth) {
      setMessage('请先通过邮箱验证码登录管理员账号。')
      return
    }

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: auth,
      body: form,
    })
    const data = await res.json()

    if (!res.ok) return setMessage(data.error ?? '添加失败')

    formElement.reset()
    setMessage('玩家添加成功。')
    await load()
  }

  async function renamePlayer(id: string, currentName: string) {
    const name = window.prompt('新的玩家名', currentName)?.trim()
    if (!name || name === currentName) return

    const auth = await getOwnerAuthHeader()
    if (!auth) {
      setMessage('请先通过邮箱验证码登录管理员账号。')
      return
    }

    const res = await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) return setMessage(data.error ?? '修改失败')

    setMessage('名称已修改；历史对局会自动显示新名称。')
    await load()
  }

  return (
    <main>
      <h1>管理</h1>
      <p className="muted">
        管理操作仅限已验证的管理员邮箱。<Link href="/login">管理员登录</Link>
      </p>

      {message && <div className="card">{message}</div>}

      <div className="card">
        <h2>添加玩家</h2>
        <form onSubmit={addPlayer} className="grid" style={{ marginBottom: 18 }}>
          <input name="name" placeholder="玩家名" required />
          <button type="submit">添加玩家</button>
        </form>
      </div>

      <div className="card">
        <h2>玩家管理</h2>
        <table>
          <thead><tr><th>玩家</th><th>操作</th></tr></thead>
          <tbody>{players.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td><button onClick={() => renamePlayer(p.id, p.name)}>修改姓名</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  )
}
