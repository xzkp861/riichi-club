import { useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { usePullDownRefresh } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { getLeaderboard, getRecentGames, type Leader, type Game } from '../../services/api'
import './index.scss'

type SortKey = 'pt' | 'rate' | 'games' | 'avgRank' | 'firstRate' | 'fourthRate' | 'avgPt'
const columns: Array<[SortKey, string]> = [
  ['pt', 'PT'], ['rate', 'Rate'], ['games', '场次'], ['avgRank', '均顺'],
  ['firstRate', '一位率'], ['fourthRate', '四位率'], ['avgPt', '平均 PT'],
]
const defaultDirection: Record<SortKey, 1 | -1> = {
  pt: -1, rate: -1, games: -1, avgRank: 1, firstRate: -1, fourthRate: 1, avgPt: -1,
}
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`
const display = (player: Leader, key: SortKey) => {
  if (key === 'pt' || key === 'avgPt') return signed(player[key])
  if (key === 'firstRate' || key === 'fourthRate') return `${(player[key] * 100).toFixed(1)}%`
  if (key === 'avgRank') return player.avgRank.toFixed(2)
  if (key === 'rate') return player.rate.toFixed(1)
  return String(player.games)
}

export default function Home() {
  const [players, setPlayers] = useState<Leader[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [sort, setSort] = useState<SortKey>('pt')
  const [direction, setDirection] = useState<1 | -1>(-1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [leaderboard, recent] = await Promise.all([getLeaderboard(), getRecentGames()])
      setPlayers(leaderboard.leaderboard)
      setGames(recent.games)
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败')
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }
  useEffect(() => { void refresh() }, [])
  usePullDownRefresh(() => { void refresh() })

  function chooseSort(key: SortKey) {
    setDirection(key === sort ? direction === -1 ? 1 : -1 : defaultDirection[key])
    setSort(key)
  }
  const sorted = [...players].sort((a, b) => (a[sort] - b[sort]) * direction || b.pt - a.pt)

  return <View className='home'>
    <View className='hero'><Text className='brand'>BOS RIICHI</Text><Text className='sub'>对局与排行</Text></View>
    {error && <View className='notice' onClick={() => void refresh()}>{error} · 点击重试</View>}
    {loading && <View className='notice'>加载中…</View>}
    <View className='section-title'>排行榜</View>
    <ScrollView scrollX className='table-scroll'>
      <View className='table'>
        <View className='row heading'><Text className='rank'>#</Text><Text className='name'>玩家</Text>
          {columns.map(([key, label]) => <Text key={key} className='cell' onClick={() => chooseSort(key)}>{label}{sort === key ? direction === -1 ? ' ↓' : ' ↑' : ''}</Text>)}
        </View>
        {sorted.map((p, index) => <View className='row' key={p.id}><Text className='rank'>{index + 1}</Text><Text className='name'>{p.name}</Text>
          {columns.map(([key]) => <Text className='cell' key={key}>{display(p, key)}</Text>)}
        </View>)}
      </View>
    </ScrollView>
    {!loading && !players.length && <View className='notice'>暂无对局数据</View>}
    <View className='section-title'>最近对局</View>
    {games.map(game => <View className='game' key={game.id}>
      <View className='date'>{new Date(game.played_at).toLocaleString('zh-CN')}</View>
      {game.game_results.map(result => <View className='result' key={result.id}>
        <Text>{result.rank}位 · {result.players.name}</Text>
        <Text>{result.raw_score} · {signed(Number(result.final_score))} PT</Text>
      </View>)}
    </View>)}
  </View>
}
