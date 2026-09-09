export const STARTING_POINTS = 25000
export const RETURN_POINTS = 30000
export const RANK_POINTS = [50, 10, -10, -30] as const

export function calculateFinalScores(rawScores: number[]) {
  if (rawScores.length !== 4) throw new Error('必须有四位玩家')
  if (rawScores.some((s) => !Number.isFinite(s) || !Number.isInteger(s))) {
    throw new Error('终局点数必须是整数')
  }

  const total = rawScores.reduce((sum, score) => sum + score, 0)
  if (total !== 100000) throw new Error('四家终局点数总和必须为 100000')

  const sortedScores = [...rawScores].sort((a, b) => b - a)
  const ranks = Array(4).fill(0) as number[]
  const rankPoints = Array(4).fill(0) as number[]

  rawScores.forEach((score, playerIndex) => {
    const firstPosition = sortedScores.indexOf(score)
    const tiedCount = sortedScores.filter((s) => s === score).length
    ranks[playerIndex] = firstPosition + 1

    let points = 0
    for (let i = firstPosition; i < firstPosition + tiedCount; i++) {
      points += RANK_POINTS[i]
    }
    rankPoints[playerIndex] = points / tiedCount
  })

  const finalScores = rawScores.map((score, index) =>
    Number((((score - RETURN_POINTS) / 1000) + rankPoints[index]).toFixed(1))
  )

  return { ranks, rankPoints, finalScores }
}
