import Taro from '@tarojs/taro'

// Set this to the HTTPS origin of the deployed BOS RIICHI website.
const API_ORIGIN = process.env.TARO_APP_API_ORIGIN || ''

export type Leader = {
  id: string; name: string; pt: number; rate: number; games: number;
  avgRank: number; firstRate: number; fourthRate: number; avgPt: number;
}
export type Game = {
  id: string; played_at: string;
  game_results: Array<{ id: string; seat: number; rank: number; raw_score: number;
    final_score: number; players: { name: string } }>
}

async function get<T>(path: string): Promise<T> {
  if (!API_ORIGIN) throw new Error('请先设置 TARO_APP_API_ORIGIN')
  const response = await Taro.request<T>({ url: `${API_ORIGIN.replace(/\/$/, '')}${path}`, method: 'GET' })
  if (response.statusCode !== 200) throw new Error(`请求失败 (${response.statusCode})`)
  return response.data
}

export const getLeaderboard = () => get<{ leaderboard: Leader[] }>('/api/leaderboard')
export const getRecentGames = () => get<{ games: Game[] }>('/api/games/recent')
