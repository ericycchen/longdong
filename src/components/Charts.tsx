import type { MonthCount, PyramidRow } from '../personal/stats'
import type { GradeBand } from '../format'

/**
 * 難度金字塔：水平長條，每列一個難度，數值直接標在長條尾端。
 * 單一數列，不需要圖例；滑鼠停留／點按時以 title 顯示說明。
 */
export function GradePyramid({ rows, max = 8 }: { rows: PyramidRow[]; max?: number }) {
  if (rows.length === 0) return <p className="muted small">完攀路線後，這裡會顯示各難度完攀了幾條。</p>
  const shown = rows.slice(0, max)
  const top = Math.max(...shown.map((r) => r.routes))
  return (
    <div className="chart" role="table" aria-label="各難度完攀路線數">
      {shown.map((r) => (
        <div key={r.value} className="pyramid-row" role="row" title={`${r.grade}：完攀 ${r.routes} 條`}>
          <span className="pyramid-label" role="rowheader">
            {r.grade}
          </span>
          <span className="pyramid-track" role="cell">
            <span className="pyramid-bar" style={{ width: `${Math.max(4, (r.routes / top) * 100)}%` }} />
            <span className="pyramid-value">{r.routes}</span>
          </span>
        </div>
      ))}
      {rows.length > max && <p className="muted small">還有 {rows.length - max} 個較低的難度</p>}
    </div>
  )
}

/** 最近 12 個月每月攀登紀錄筆數：直條，只標月份；數值在滑鼠停留／點按時顯示 */
export function MonthlyChart({ months }: { months: MonthCount[] }) {
  const top = Math.max(1, ...months.map((m) => m.count))
  const W = 336
  const H = 96
  const gap = 6
  const barW = (W - gap * (months.length - 1)) / months.length
  const total = months.reduce((n, m) => n + m.count, 0)
  return (
    <figure className="chart monthly">
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`最近 12 個月共 ${total} 筆攀登紀錄`}>
        <line x1="0" x2={W} y1={H + 0.5} y2={H + 0.5} className="axis" />
        {months.map((m, i) => {
          const h = m.count === 0 ? 0 : Math.max(4, (m.count / top) * (H - 14))
          const x = i * (barW + gap)
          return (
            <g key={m.key}>
              <title>{`${m.key.replace('-', '/')}：${m.count} 筆`}</title>
              {/* 加大的透明感應區，方便手機點按 */}
              <rect x={x} y={0} width={barW} height={H} fill="transparent" />
              {h > 0 && <path className="bar" d={roundedTop(x, H - h, barW, h, Math.min(4, barW / 2))} />}
              {m.count > 0 && m.count === top && (
                <text x={x + barW / 2} y={H - h - 4} className="value" textAnchor="middle">
                  {m.count}
                </text>
              )}
              {(i === 0 || i === months.length - 1 || m.label === '1月') && (
                <text x={x + barW / 2} y={H + 14} className="tick" textAnchor="middle">
                  {m.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/** 上方圓角、底部貼齊基線的長條 */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

/**
 * 區域的難度分佈：五個區間的直條，數量標在柱子上方。
 * 單一數列、所有區域同一個顏色，方便互相比較；區域色只用在卡片左框。
 */
export function GradeDistribution({ bands }: { bands: { band: GradeBand; label: string; count: number }[] }) {
  const top = Math.max(1, ...bands.map((b) => b.count))
  const W = 160
  const H = 44
  const gap = 6
  const barW = (W - gap * (bands.length - 1)) / bands.length
  const summary = bands.map((b) => `${b.label} ${b.count} 條`).join('、')
  return (
    <svg className="grade-dist" viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-label={`難度分佈：${summary}`}>
      <line x1="0" x2={W} y1={H + 12.5} y2={H + 12.5} className="axis" />
      {bands.map((b, i) => {
        const h = b.count === 0 ? 0 : Math.max(3, (b.count / top) * H)
        const x = i * (barW + gap)
        const y = H + 12 - h
        return (
          <g key={b.band}>
            <title>{`${b.label}：${b.count} 條`}</title>
            <rect x={x} y={0} width={barW} height={H + 26} fill="transparent" />
            {h > 0 && <path className="bar" d={roundedTop(x, y, barW, h, 3)} />}
            <text x={x + barW / 2} y={y - 3} className="value" textAnchor="middle">
              {b.count || ''}
            </text>
            <text x={x + barW / 2} y={H + 24} className="tick" textAnchor="middle">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
