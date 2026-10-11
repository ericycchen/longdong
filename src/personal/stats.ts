import type { Route } from '../data/schema'
import { isSent, type Tick } from './model'

export interface PyramidRow {
  grade: string
  value: number
  /** 這個難度完攀的路線數（同一條路線只算一次） */
  routes: number
}

/** 難度金字塔：每個難度完攀過幾條不同的路線，難的在上 */
export function gradePyramid(ticks: Tick[], lookup: (id: string) => Route | undefined): PyramidRow[] {
  const sentRoutes = new Set(ticks.filter((t) => isSent(t.style)).map((t) => t.routeId))
  const byValue = new Map<number, PyramidRow>()
  for (const id of sentRoutes) {
    const r = lookup(id)
    if (!r?.grade || r.gradeValue === undefined) continue
    const row = byValue.get(r.gradeValue) ?? { grade: r.grade.replace(/\s.*$/, ''), value: r.gradeValue, routes: 0 }
    row.routes++
    byValue.set(r.gradeValue, row)
  }
  return [...byValue.values()].sort((a, b) => b.value - a.value)
}

export interface MonthCount {
  /** YYYY-MM */
  key: string
  label: string
  count: number
}

/** 最近 12 個月（含本月）每月的攀登紀錄筆數 */
export function monthlyCounts(ticks: Tick[], now = new Date()): MonthCount[] {
  const months: MonthCount[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ key, label: `${d.getMonth() + 1}月`, count: 0 })
  }
  const index = new Map(months.map((m) => [m.key, m]))
  for (const t of ticks) {
    const m = index.get(t.date.slice(0, 7))
    if (m) m.count++
  }
  return months
}

/** 依月份分組（新到舊），給時間軸用 */
export function groupByMonth(ticks: Tick[]): { key: string; label: string; ticks: Tick[] }[] {
  const groups: { key: string; label: string; ticks: Tick[] }[] = []
  for (const t of ticks) {
    const key = t.date.slice(0, 7)
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) {
      const [y, m] = key.split('-')
      g = { key, label: `${y} 年 ${Number(m)} 月`, ticks: [] }
      groups.push(g)
    }
    g.ticks.push(t)
  }
  return groups
}
