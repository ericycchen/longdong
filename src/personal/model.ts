/**
 * 個人資料（收藏、攀登紀錄）只存在使用者裝置上。
 *
 * 每筆紀錄都有唯一 key 與 updatedAt，刪除以 deleted 標記保留（tombstone），
 * 這樣匯入備份、之後同步到雲端時，都能用「較新者為準」合併，不會把已刪除的資料救回來。
 */

export type TickStyle = 'onsight' | 'flash' | 'redpoint' | 'follow' | 'toprope' | 'attempt'

export const TICK_STYLES: { value: TickStyle; label: string; sent: boolean }[] = [
  { value: 'onsight', label: 'Onsight', sent: true },
  { value: 'flash', label: 'Flash', sent: true },
  { value: 'redpoint', label: 'Redpoint', sent: true },
  { value: 'follow', label: '跟攀', sent: true },
  { value: 'toprope', label: '上方確保', sent: true },
  { value: 'attempt', label: '嘗試', sent: false },
]

export const TICK_STYLE_LABEL = Object.fromEntries(TICK_STYLES.map((s) => [s.value, s.label])) as Record<TickStyle, string>

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

const TICK_STYLE_VALUES = new Set(TICK_STYLES.map((s) => s.value))

/** 檢查並整理匯入的備份檔；格式不對時丟出可以直接顯示給使用者的錯誤 */
export function parseExport(raw: unknown): PersonalExport {
  const fail = (why: string): never => {
    throw new Error(`這不是有效的備份檔（${why}）`)
  }
  if (!raw || typeof raw !== 'object') fail('不是 JSON 物件')
  const data = raw as Record<string, unknown>
  if (data.format !== 'longdong-personal') fail('檔案格式不符')
  if (data.version !== 1) fail(`不支援的版本 ${String(data.version)}`)
  const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
  const favorites = Array.isArray(data.favorites) ? data.favorites : fail('缺少收藏資料')
  const ticks = Array.isArray(data.ticks) ? data.ticks : fail('缺少攀登紀錄')
  for (const f of favorites as Favorite[]) {
    if (!isStr(f?.routeId) || !isStr(f.updatedAt) || !isStr(f.createdAt)) fail('收藏資料欄位不完整')
  }
  for (const t of ticks as Tick[]) {
    if (!isStr(t?.id) || !isStr(t.routeId) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !TICK_STYLE_VALUES.has(t.style))
      fail('攀登紀錄欄位不完整')
    if (!isStr(t.updatedAt) || !isStr(t.createdAt)) fail('攀登紀錄缺少時間')
  }
  return data as unknown as PersonalExport
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
