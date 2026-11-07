import Link from 'next/link'
import { danLabel, danProgress, type DanState } from '@/lib/dan'

export default function DanPanel({ state }: { state: DanState }) {
  const { rule, count, rankSum, average, remaining, maximumSum, attainableSum } = danProgress(state)
  return (
    <section className="card" aria-label="段位与晋级考核">
      <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div><div className="muted">当前段位</div><h2 style={{ fontSize: 32, margin: '8px 0' }}>{danLabel(state.dan)}</h2></div>
        <Link href="/dan">查看完整段位规则 →</Link>
      </div>
      {!rule ? <p>已达到十段。后续对局继续记录 PT、Rate 与个人统计，不再进行升段考核。</p> : <>
        <p>下一目标：<strong>{danLabel(rule.to)}</strong> · 最近 <strong>{rule.windowSize}</strong> 场考核均顺 ≤ <strong>{(rule.averageTenths / 10).toFixed(2)}</strong></p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          考核窗口：{count} / {rule.windowSize} 场（本段累计已打 {state.gamesSincePromotion} 场）
          <progress value={count} max={rule.windowSize} style={{ display: 'block', width: '100%', marginTop: 10, height: 12 }} />
        </label>
        <div className="grid">
          <div><div className="muted">{remaining ? '已打场次暂定均顺' : '最近窗口考核均顺'}</div><strong style={{ fontSize: 26 }}>{average === null ? '—' : average.toFixed(3)}</strong></div>
          <div><div className="muted">当前窗口顺位和</div><strong style={{ fontSize: 26 }}>{count ? rankSum : '—'}</strong><span className="muted"> / 满窗目标 ≤ {maximumSum}</span></div>
        </div>
        <p role="status">{remaining
          ? `还需完成 ${remaining} 场，才开始判定本段晋级；场数未满不能提前升级。`
          : '窗口已满，暂未达标。下一场移出最早一场、加入新一场后重新判定，不会清空整个考核。'}</p>
        {maximumSum !== attainableSum && <p className="muted">同点折算后的顺位和以 0.5 为步长，因此本段实际需要顺位和 ≤ {attainableSum}；不会先四舍五入均顺再判定。</p>}
        {count > 0 && <details>
          <summary style={{ cursor: 'pointer' }}>查看当前考核的 {count} 场（从早到晚）</summary>
          <div style={{ overflowX: 'auto', marginTop: 8 }}><table>
            <thead><tr><th>窗口序号</th><th>日期</th><th>考核顺位</th><th>对局</th></tr></thead>
            <tbody>{state.window.map((sample, index) => <tr key={sample.gameId}>
              <td>{index + 1}</td><td>{new Date(sample.playedAt).toLocaleDateString('zh-CN')}</td>
              <td>{sample.rank}</td><td><Link href={`/games#${sample.gameId}`}>查看本场</Link></td>
            </tr>)}</tbody>
          </table></div>
        </details>}
      </>}
      <p className="muted">同点按占据名次的平均值计入考核，例如并列一位计 1.5。晋级后从下一场重新积累；正常输牌不降段。历史纠错会重新推导段位与晋级履历。</p>
    </section>
  )
}
