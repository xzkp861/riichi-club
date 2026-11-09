'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Player = { id: string; name: string; ranking_excluded: boolean }
type Patch = { name?: string; ranking_excluded?: boolean }

export default function ManagePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/players', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '读取失败')
      setPlayers([...(data.players ?? [])].sort((a: Player, b: Player) => a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id)))
      setReady(data.rankingSettingsReady === true)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取失败，请重试')
      setReady(false)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function updatePlayer(player: Player, patch: Patch, successMessage: string) {
    if (!pin) { setMessage('请先输入管理员 PIN'); return }
    setBusyId(player.id)
    setMessage('')
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '保存失败')
      setMessage(successMessage)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，请重试')
    } finally { setBusyId(null) }
  }
  async function renamePlayer(player: Player) {
    if (!pin) { setMessage('请先输入管理员 PIN'); return }
    const name = window.prompt('新的玩家名', player.name)?.trim()
    if (!name || name === player.name) return
    await updatePlayer(player, { name }, '名称已修改；历史对局会自动显示新名称。')
  }
  async function toggleRanking(player: Player) {
    if (!pin || !ready) { setMessage('请先输入管理员 PIN，并完成参榜设置初始化'); return }
    const exclude = !player.ranking_excluded
    if (!window.confirm(exclude
      ? `将 ${player.name} 设为不参榜？姓名保留在榜底，其余数据灰显，历史战绩和个人主页不受影响。`
      : `让 ${player.name} 恢复参榜？将按原有生涯 Rate 重新进入排行榜。`)) return
    await updatePlayer(player, { ranking_excluded: exclude }, exclude
      ? `${player.name} 已退出排行榜；历史数据和 Rate 计算不变。`
      : `${player.name} 已恢复参榜。`)
  }

  return <main>
    <h1>管理</h1>
    <p className="muted">参榜开关只影响首页展示，不删除对局、不重置 Rate，也不影响其他玩家的 Rate。个人主页保持原样。</p>
    {message && <div className="card" role="status">{message}</div>}
    {!loading && !ready && <div className="card" role="alert">
      <strong>参榜设置尚未就绪</strong>
      <p>请在 Supabase SQL Editor 执行仓库中的 <code>supabase/migrations/003_ranking_visibility.sql</code>，然后刷新本页。完成前不开放排行榜，现有个人主页仍可访问。</p>
      <button type="button" onClick={() => void load()}>重新检查</button>
    </div>}
    <section className="card">
      <h2>玩家管理</h2>
      <label htmlFor="admin-pin">管理员 PIN</label>
      <input id="admin-pin" type="password" placeholder="管理员 PIN" value={pin}
        onChange={event => setPin(event.target.value)} autoComplete="off" style={{ margin: '8px 0 16px' }} />
      {loading ? <p className="muted">正在读取玩家…</p> : <div style={{ overflowX: 'auto' }}><table>
        <thead><tr><th>玩家</th><th>参榜状态</th><th>排行榜操作</th><th>姓名</th></tr></thead>
        <tbody>{players.map(player => <tr key={player.id}>
          <td><Link href={`/players/${player.id}`}>{player.name}</Link></td>
          <td>{!ready ? '待初始化' : player.ranking_excluded ? '不参榜' : '参与排名'}</td>
          <td><button type="button" onClick={() => void toggleRanking(player)}
            disabled={!ready || !pin || busyId !== null}>
            {busyId === player.id ? '保存中…' : player.ranking_excluded ? '恢复参榜' : '隐藏排名'}
          </button></td>
          <td><button type="button" onClick={() => void renamePlayer(player)} disabled={!pin || busyId !== null}>修改姓名</button></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <p><Link href="/">查看排行榜 →</Link></p>
  </main>
}
