export type PlayerSettingsPatch = { name?: string; ranking_excluded?: boolean }
export type DatabaseErrorLike = { code?: string; message: string }

export function isMissingRankingColumn(error: DatabaseErrorLike): boolean {
  return (error.code === '42703' || error.code === 'PGRST204') &&
    error.message.includes('ranking_excluded')
}

/** Allow-list fields: PIN and arbitrary client attributes never reach UPDATE. */
export function parsePlayerSettings(body: Record<string, unknown>): PlayerSettingsPatch {
  const patch: PlayerSettingsPatch = {}
  if (Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw new Error('玩家名不能为空')
    patch.name = body.name.trim()
  }
  if (Object.hasOwn(body, 'ranking_excluded')) {
    if (typeof body.ranking_excluded !== 'boolean') throw new Error('参榜设置必须为布尔值')
    patch.ranking_excluded = body.ranking_excluded
  }
  if (!Object.keys(patch).length) throw new Error('没有可修改的设置')
  return patch
}
