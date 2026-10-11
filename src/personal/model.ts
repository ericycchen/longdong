/**
 * 個人資料（收藏、攀登紀錄）只存在使用者裝置上。
 *
 * 每筆紀錄都有唯一 key 與 updatedAt，刪除以 deleted 標記保留（tombstone），
 * 這樣匯入備份、之後同步到雲端時，都能用「較新者為準」合併，不會把已刪除的資料救回來。
 */

export type TickStyle = 'onsight' | 'flash' | 'redpoint' | 'follow' | 'toprope' | 'attempt'

/** 攀登方式；顯示文字見 i18n 的 style.* */
export const TICK_STYLES: { value: TickStyle; sent: boolean }[] = [
  { value: 'onsight', sent: true },
  { value: 'flash', sent: true },
  { value: 'redpoint', sent: true },
  { value: 'follow', sent: true },
  { value: 'toprope', sent: true },
  { value: 'attempt', sent: false },
]


export function isSent(style: TickStyle): boolean {
  return TICK_STYLES.find((s) => s.value === style)?.sent ?? false
}

interface Syncable {
  /** ISO 8601 */
  createdAt: string
  updatedAt: string
  deleted?: boolean
}

export interface Favorite extends Syncable {
  routeId: string
}

export interface Tick extends Syncable {
  id: string
  routeId: string
  /** YYYY-MM-DD */
  date: string
  style: TickStyle
  note?: string
}

export interface PersonalExport {
  format: 'longdong-personal'
  version: 1
  exportedAt: string
  favorites: Favorite[]
  ticks: Tick[]
}

/** 以 key 合併兩組紀錄，同一 key 取 updatedAt 較新者 */
export function mergeRecords<T extends Syncable>(current: T[], incoming: T[], key: (r: T) => string): { merged: T[]; changed: T[] } {
  const byKey = new Map(current.map((r) => [key(r), r]))
  const changed: T[] = []
  for (const r of incoming) {
    const existing = byKey.get(key(r))
    if (!existing || r.updatedAt > existing.updatedAt) {
      byKey.set(key(r), r)
      changed.push(r)
    }
  }
  return { merged: [...byKey.values()], changed }
}

export function newId(): string {
  // iOS 15.4 以前沒有 randomUUID
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** 裝置當地日期 YYYY-MM-DD */
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
