'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = { id: string; name: string }

const SEATS = ['东', '南', '西', '北']

export default function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [players, setPlayers] = useState<Player[]>([])
  const [playerIds, setPlayerIds] = useState(['', '', '', ''])
  const [scores, setScores] = useState(['', '', '', ''])
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('读取中...')
  const [deleting, setDeleting] = useState(false)

  const total = useMemo(
    () =>
      scores.reduce(
        (sum, value) => sum + (value === '' ? 0 : Number(value)),
        0
      ),
    [scores]
  )

  const diff = 100000 - total

  const totalOK =
    scores.every((score) => score !== '') &&
    total === 100000

  const playersOK =
    playerIds.every(Boolean) &&
    new Set(playerIds).size === 4

  useEffect(() => {
    fetch(`/api/games/${id}`, {
      cache: 'no-store',
    })
      .then(async (response) => ({
        ok: response.ok,
        data: await response.json(),
      }))
      .then(({ ok, data }) => {
        if (!ok) {
          setMessage(data.error ?? '读取失败')
          return
        }

        setPlayers(data.players ?? [])

        const results = [...data.game.game_results].sort(
          (a: any, b: any) => a.seat - b.seat
        )

        setPlayerIds(
          results.map((result: any) => result.player_id)
        )

        setScores(
          results.map((result: any) =>
            String(result.raw_score)
          )
        )

        setMessage('')
      })
      .catch((error) => {
        setMessage(error.message)
      })
  }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()

    if (!totalOK) {
      setMessage(
        `总分必须为 100000，目前为 ${total}`
      )
      return
    }

    if (!playersOK) {
      setMessage('请选择四位不同的玩家')
      return
    }

    const res = await fetch(`/api/games/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerIds,
        scores: scores.map(Number),
        pin,
      }),
    })

    const text = await res.text()
    const data = text ? JSON.parse(text) : {}

    if (!res.ok) {
      setMessage(data.error ?? '修改失败')
      return
    }

    router.push('/games')
    router.refresh()
  }

  async function deleteGame() {
    if (!pin) {
      setMessage('请先输入管理员 PIN')
      return
    }

    const confirmed = window.confirm(
      '确定要删除这场对局吗？\n\n删除后无法恢复。'
    )

    if (!confirmed) return

    setDeleting(true)
    setMessage('')

    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin,
        }),
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}

      if (!res.ok) {
        setMessage(data.error ?? '删除失败')
        setDeleting(false)
        return
      }

      router.push('/games')
      router.refresh()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : '删除失败'
      )
      setDeleting(false)
    }
  }

  return (
    <main>
      <h1>修改对局</h1>

      {message && (
        <div className="card">
          {message}
        </div>
      )}

      <div className="card">
        <form onSubmit={save}>
          {[0, 1, 2, 3].map((i) => (
            <div
              className="grid"
              style={{ marginBottom: 10 }}
              key={i}
            >
              <select
                value={playerIds[i]}
                onChange={(e) =>
                  setPlayerIds((previous) =>
                    previous.map((value, j) =>
                      j === i
                        ? e.target.value
                        : value
                    )
                  )
                }
                required
              >
                <option value="">
                  {SEATS[i]} · 选择玩家
                </option>

                {players.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {player.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="100"
                value={scores[i]}
                onChange={(e) =>
                  setScores((previous) =>
                    previous.map((value, j) =>
                      j === i
                        ? e.target.value
                        : value
                    )
                  )
                }
                required
              />
            </div>
          ))}

          <div
            className="card"
            style={{
              margin: '12px 0',
            }}
          >
            <b>
              当前合计：
              {total.toLocaleString()} / 100,000
            </b>

            <div
              className="muted"
              style={{
                marginTop: 6,
              }}
            >
              {totalOK
                ? '✓ 总分正确'
                : diff > 0
                  ? `还差 ${diff.toLocaleString()} 点`
                  : `多出 ${Math.abs(diff).toLocaleString()} 点`}
            </div>
          </div>

          <input
            type="password"
            placeholder="管理员 PIN"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            required
            style={{
              marginBottom: 12,
            }}
          />

          <button
            type="submit"
            disabled={
              !totalOK ||
              !playersOK ||
              deleting
            }
            style={{
              opacity:
                totalOK &&
                playersOK &&
                !deleting
                  ? 1
                  : 0.5,
            }}
          >
            保存修改
          </button>
        </form>
      </div>

      <div
        className="card"
        style={{
          marginTop: 28,
          border: '1px solid #d92d20',
        }}
      >
        <h2>危险操作</h2>

        <p className="muted">
          删除后，这场对局及对应的 PT
          统计都会从排行榜中移除，且无法恢复。
        </p>

        <button
          type="button"
          onClick={deleteGame}
          disabled={deleting}
          style={{
            background: '#b42318',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting
            ? '正在删除...'
            : '删除本场'}
        </button>
      </div>
    </main>
  )
}
