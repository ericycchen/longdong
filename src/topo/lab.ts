import { decodeEdit, encodeMarks, type Marks, type StoredRoutes } from './model'

/**
 * Topo 實驗室（/topo-lab）：只在這台裝置上試畫，不上傳。手勢交給 react-zoom-pan-pinch，
 * 用來和編輯模式自己寫的 ZoomPane 比較手機上的手感。標記的格式與編輯模式相同（model.ts）。
 */

/** 復原／重做：present 是目前的標記 */
export interface History {
  past: Marks[]
  present: Marks
  future: Marks[]
}

export const startHistory = (marks: Marks): History => ({ past: [], present: marks, future: [] })

/** 換成新的標記；和目前相同時不留一筆空的復原（只有一點的線也算數：sameMarks 依存檔格式比較，會忽略它） */
export function commit(h: History, next: Marks): History {
  if (JSON.stringify(h.present) === JSON.stringify(next)) return h
  return { past: [...h.past, h.present], present: next, future: [] }
}

export function undo(h: History): History {
  const prev = h.past.at(-1)
  return prev ? { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] } : h
}

export function redo(h: History): History {
  const next = h.future[0]
  return next ? { past: [...h.past, h.present], present: next, future: h.future.slice(1) } : h
}

/** 刪掉路線 id 線上的第 index 個點；刪到沒有點就拿掉這條線（bolt 留著） */
export function removePoint(marks: Marks, id: string, index: number): Marks {
  const line = (marks[id]?.line ?? []).filter((_, i) => i !== index)
  const { line: _old, ...rest } = marks[id] ?? {}
  return { ...marks, [id]: line.length ? { ...rest, line } : rest }
}

/** 存在這台裝置上的 key：每張照片一份 */
export const storageKey = (photo: string) => `longdong.topoLab.${photo}`

/** 存成和資料庫相同的格式（點是 "x,y"，線段以空白分開） */
export const serialize = (marks: Marks): string => JSON.stringify(encodeMarks(marks))

const POINT = /^\d{1,5},\d{1,5}$/

/** 讀回存起來的標記；格式不對時丟出錯誤（不猜、不補） */
export function parseSaved(text: string): Marks {
  const routes: unknown = JSON.parse(text)
  if (!routes || typeof routes !== 'object' || Array.isArray(routes)) throw new Error('not an object')
  for (const [key, r] of Object.entries(routes)) {
    if (!r || typeof r !== 'object') throw new Error(`bad route ${key}`)
    const { line, bolts, ...extra } = r as Record<string, unknown>
    if (Object.keys(extra).length) throw new Error(`unknown field in ${key}`)
    if (line !== undefined && (typeof line !== 'string' || !line.split(' ').every((p) => POINT.test(p)))) throw new Error(`bad line ${key}`)
    if (bolts !== undefined && (!bolts || typeof bolts !== 'object' || !Object.values(bolts).every((p) => typeof p === 'string' && POINT.test(p)))) throw new Error(`bad bolts ${key}`)
  }
  return decodeEdit('lab', { uid: '', createdAt: 0, routes: routes as StoredRoutes }).marks
}
