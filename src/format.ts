import type { Route, RouteStatus, RouteType } from './data/schema'

export const TYPE_LABEL: Record<RouteType, string> = {
  sport: '運攀',
  trad: '傳攀',
  toprope: '上方架繩',
  boulder: '抱石',
  mixed: '混合',
}

export const STATUS_INFO: Record<RouteStatus, { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  tested: { label: '已拉測', tone: 'ok' },
  rebolted: { label: '已更新', tone: 'ok' },
  'needs-test': { label: '待拉測', tone: 'warn' },
  'needs-rebolt': { label: '待更新', tone: 'warn' },
  closed: { label: '路線封閉', tone: 'danger' },
  'to-remove': { label: '待移除', tone: 'danger' },
  unknown: { label: '待查', tone: 'muted' },
}

const NOT_A_BOLT = new Set(['無 Anchor', 'No Anchor', '天然固定點'])

/**
 * 運攀要帶的快扣數：每個 bolt 位置加上 anchor。
 * 與其他路線「共用」的 bolt 也要扣，所以不用 Sheet 的「Bolt 統計」（它不算共用的）。
 */
export function quickdraws(route: Route): number | undefined {
  if (route.type !== 'sport') return undefined
  const n = route.bolts.length + route.anchors.filter((a) => !NOT_A_BOLT.has(a.material)).length
  return n > 0 ? n : undefined
}

/** 路線種類的顯示文字，運攀前面加上快扣數，例如「18快扣 運攀」 */
export function typeText(route: Route): string {
  if (route.isFixture) return '固定點'
  if (!route.type) return ''
  const qd = quickdraws(route)
  return qd ? `${qd}快扣 ${TYPE_LABEL[route.type]}` : TYPE_LABEL[route.type]
}

/** "2025-12-04" → "2025/12/04"；部分日期照樣顯示 */
export function formatDate(d: string | undefined): string {
  return d ? d.replace(/-/g, '/') : ''
}

/** 從部分日期算到今天經過幾年（無條件捨去） */
export function yearsSince(d: string | undefined, now = new Date()): number | undefined {
  if (!d) return undefined
  const [y, m = '1', day = '1'] = d.split('-')
  const then = new Date(Number(y), Number(m) - 1, Number(day))
  let years = now.getFullYear() - then.getFullYear()
  if (now.getMonth() < then.getMonth() || (now.getMonth() === then.getMonth() && now.getDate() < then.getDate())) years--
  return Math.max(0, years)
}

export function relativeTime(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 31) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 個月前`
  return `${Math.floor(days / 365)} 年前`
}
