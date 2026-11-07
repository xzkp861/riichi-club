import Link from 'next/link'
import { DAN_RULES, DAN_RULE_VERSION, danLabel } from '@/lib/dan'

export default function DanRulesPage() {
  return <main>
    <p><Link href="/">← 返回排行榜</Link></p><h1>BOS 段位规则</h1>
    <p className="muted">BOS RIICHI 俱乐部内部段位 · 规则版本 {DAN_RULE_VERSION} · 全员初段起步</p>
    <section className="card" style={{ overflowX: 'auto' }}>
      <table><thead><tr><th>当前段位</th><th>晋升目标</th><th>最近有效场数</th><th>考核均顺上限</th><th>顺位和上限</th></tr></thead>
        <tbody>{DAN_RULES.map(rule => <tr key={rule.from}>
          <td>{danLabel(rule.from)}</td><td>{danLabel(rule.to)}</td><td>{rule.windowSize} 场</td>
          <td>≤ {(rule.averageTenths / 10).toFixed(2)}</td><td>≤ {rule.windowSize * rule.averageTenths / 10}</td>
        </tr>)}</tbody>
      </table>
    </section>
    <section className="card"><h2>如何晋级</h2>
      <p>所有玩家默认初段，不设置级位。打满当前考核场数后，每一场都检查最近 N 场；顺位和达标就立即升一段。失败时窗口向后滚动一场，不整段清零。</p>
      <p>晋级当场属于旧段考核。下一段只使用晋级之后的新对局，旧成绩不重复使用；不会一场连升多段。最高为十段，正常对局不降段。</p>
      <p>例：前 8 场顺位和 ≤ 20 即升二段，第 9 场开始积累三段所需的 10 场。</p>
    </section>
    <section className="card"><h2>同点与计算精度</h2>
      <p>升段使用占据名次的平均值：并列一位为 1.5，并列三位为 3.5，四人同点均为 2.5。这与对局表里的“并列名次”分开记录，不改原有 Rate 公式。</p>
      <p>按未四舍五入的顺位和判断。由于考核顺位以 0.5 为步长，例如 12 场 × 2.40 = 28.8，实际可达标的最大顺位和为 28.5。</p>
    </section>
    <section className="card"><h2>历史记录与纠错</h2>
      <p>现有全部历史对局默认纳入。系统按对局时间、创建时间、对局 ID 确定先后，每次读取都从初段完整推导，不直接修改或清空原始数据。</p>
      <p>修改、删除、补录历史后，刷新页面即重新判定。因错误记录取得的晋级可能被撤销，这属于数据纠错，不是普通输牌降段。</p>
      <p>仅统计四名不同玩家、整数点数且合计 100000 的完整四麻对局。发现异常时暂停展示段位并提示核对，不悄悄跳过错误数据。</p>
      <p>首页默认按段位降序；同段按 Rate、玩家 ID 稳定排序，不以考核窗口完成比例判断实力。其他统计仍可点击表头排序。</p>
    </section>
  </main>
}
