'use client'

import { useMemo, useState } from 'react'

const HAN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110]

function ceil100(value: number) {
  return Math.ceil(value / 100) * 100
}

function scoreBase(han: number, fu: number) {
  const raw = fu * 2 ** (han + 2)

  if (han >= 13) return { base: 8000, label: '役满' }
  if (han >= 11) return { base: 6000, label: '三倍满' }
  if (han >= 8) return { base: 4000, label: '倍满' }
  if (han >= 6) return { base: 3000, label: '跳满' }
  if (han >= 5 || raw >= 2000) return { base: 2000, label: '满贯' }

  return { base: raw, label: '' }
}

function formatPoint(value: number) {
  return value.toLocaleString('zh-CN')
}

export default function CalculatorPage() {
  const [han, setHan] = useState(3)
  const [fu, setFu] = useState(40)

  const result = useMemo(() => {
    const { base, label } = scoreBase(han, fu)

    const dealerRon = ceil100(base * 6)
    const dealerTsumoEach = ceil100(base * 2)
    const nonDealerRon = ceil100(base * 4)
    const nonDealerTsumoDealer = ceil100(base * 2)
    const nonDealerTsumoOther = ceil100(base)

    return {
      label,
      dealerRon,
      dealerTsumoEach,
      dealerTsumoTotal: dealerTsumoEach * 3,
      nonDealerRon,
      nonDealerTsumoDealer,
      nonDealerTsumoOther,
      nonDealerTsumoTotal: nonDealerTsumoDealer + nonDealerTsumoOther * 2,
    }
  }, [han, fu])

  const buttonStyle = (selected: boolean): React.CSSProperties => ({
    minWidth: 54,
    minHeight: 44,
    padding: '8px 12px',
    borderRadius: 10,
    border: selected ? '2px solid #111' : '1px solid #ccc',
    background: selected ? '#111' : '#fff',
    color: selected ? '#fff' : '#111',
    fontWeight: selected ? 700 : 500,
    cursor: 'pointer',
  })

  return (
    <main>
      <h1>算分工具</h1>
      <p className="muted">选择翻数和符数，即时查看庄家 / 闲家的荣和与自摸点数。暂不计本场棒与立直棒。</p>

      <section className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>翻数</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {HAN_OPTIONS.map((value) => (
            <button key={value} type="button" onClick={() => setHan(value)} style={buttonStyle(han === value)}>
              {value === 13 ? '13翻+' : `${value}翻`}
            </button>
          ))}
        </div>

        <h2 style={{ marginTop: 28 }}>符数</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {FU_OPTIONS.map((value) => (
            <button key={value} type="button" onClick={() => setFu(value)} style={buttonStyle(fu === value)}>
              {value}符
            </button>
          ))}
        </div>

        <div style={{ marginTop: 30, paddingTop: 24, borderTop: '1px solid #ddd' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <strong style={{ fontSize: 24 }}>{han === 13 ? '13翻以上' : `${han}翻 ${fu}符`}</strong>
            {result.label && <span style={{ fontWeight: 700 }}>{result.label}</span>}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th></th><th>荣和</th><th>自摸</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th>庄家</th>
                  <td><strong style={{ fontSize: 22 }}>{formatPoint(result.dealerRon)}</strong></td>
                  <td>
                    <strong style={{ fontSize: 22 }}>{formatPoint(result.dealerTsumoEach)} ALL</strong>
                    <div className="muted">合计 {formatPoint(result.dealerTsumoTotal)}</div>
                  </td>
                </tr>
                <tr>
                  <th>闲家</th>
                  <td><strong style={{ fontSize: 22 }}>{formatPoint(result.nonDealerRon)}</strong></td>
                  <td>
                    <strong style={{ fontSize: 22 }}>{formatPoint(result.nonDealerTsumoOther)} / {formatPoint(result.nonDealerTsumoDealer)}</strong>
                    <div className="muted">闲家各付 / 庄家付 · 合计 {formatPoint(result.nonDealerTsumoTotal)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 28 }}>
        <h2 style={{ marginTop: 0 }}>翻数速查表</h2>
        <p className="muted">常见役种。部分役副露后会降 1 翻。</p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>役种</th><th>门清</th><th>副露</th></tr></thead>
            <tbody>
              <tr><td>立直 / 一发 / 门前清自摸和 / 平和 / 一杯口</td><td>1翻</td><td>不可</td></tr>
              <tr><td>断幺九</td><td>1翻</td><td>1翻*</td></tr>
              <tr><td>役牌（白发中、场风、自风）</td><td>1翻</td><td>1翻</td></tr>
              <tr><td>海底摸月 / 河底捞鱼 / 岭上开花 / 抢杠</td><td>1翻</td><td>1翻</td></tr>
              <tr><td>双立直</td><td>2翻</td><td>不可</td></tr>
              <tr><td>七对子</td><td>2翻</td><td>不可</td></tr>
              <tr><td>对对和 / 三暗刻 / 三色同刻 / 三杠子 / 混老头 / 小三元</td><td>2翻</td><td>2翻</td></tr>
              <tr><td>三色同顺 / 一气通贯</td><td>2翻</td><td>1翻</td></tr>
              <tr><td>混全带幺九</td><td>2翻</td><td>1翻</td></tr>
              <tr><td>纯全带幺九</td><td>3翻</td><td>2翻</td></tr>
              <tr><td>混一色</td><td>3翻</td><td>2翻</td></tr>
              <tr><td>二杯口</td><td>3翻</td><td>不可</td></tr>
              <tr><td>清一色</td><td>6翻</td><td>5翻</td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>* 断幺九是否允许副露取决于牌桌规则；本表按常见“食断”规则列出。</p>
      </section>

      <section className="card" style={{ marginTop: 28 }}>
        <h2 style={{ marginTop: 0 }}>符数速查表</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>项目</th><th>符数</th></tr></thead>
            <tbody>
              <tr><td>基础符</td><td>20符</td></tr>
              <tr><td>门清荣和</td><td>+10符</td></tr>
              <tr><td>自摸</td><td>+2符（平和自摸除外）</td></tr>
              <tr><td>役牌雀头（三元牌 / 场风 / 自风）</td><td>+2符；场风兼自风通常合计 +4符</td></tr>
              <tr><td>边张 / 嵌张 / 单骑听牌</td><td>+2符</td></tr>
              <tr><td>中张明刻 / 暗刻</td><td>2符 / 4符</td></tr>
              <tr><td>幺九字牌明刻 / 暗刻</td><td>4符 / 8符</td></tr>
              <tr><td>中张明杠 / 暗杠</td><td>8符 / 16符</td></tr>
              <tr><td>幺九字牌明杠 / 暗杠</td><td>16符 / 32符</td></tr>
              <tr><td>七对子</td><td>固定 25符，不进位</td></tr>
              <tr><td>平和自摸</td><td>固定 20符</td></tr>
              <tr><td>副露后仅有基础 20符的荣和</td><td>按 30符计算</td></tr>
              <tr><td>一般符数结算</td><td>合计后向上进位到 10符</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
