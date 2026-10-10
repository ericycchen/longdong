import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { useSyncExternalStore } from 'react'
import { mergeRecords, newId, type Favorite, type PersonalExport, type Tick } from './model'

interface PersonalDB extends DBSchema {
  favorites: { key: string; value: Favorite }
  ticks: { key: string; value: Tick; indexes: { byRoute: string } }
}

let dbPromise: Promise<IDBPDatabase<PersonalDB>> | undefined

function db(): Promise<IDBPDatabase<PersonalDB>> {
  dbPromise ??= openDB<PersonalDB>('longdong-personal', 1, {
    upgrade(d) {
      d.createObjectStore('favorites', { keyPath: 'routeId' })
      d.createObjectStore('ticks', { keyPath: 'id' }).createIndex('byRoute', 'routeId')
    },
  })
  return dbPromise
}

/* ---------- 記憶體快照：資料量小，全部載入，畫面用 useSyncExternalStore 訂閱 ---------- */

export interface PersonalState {
  ready: boolean
  /** 未刪除的收藏 routeId */
  favorites: Set<string>
  /** 未刪除的紀錄，日期新到舊 */
  ticks: Tick[]
  error?: string
}

let state: PersonalState = { ready: false, favorites: new Set(), ticks: [] }
const listeners = new Set<() => void>()

function emit(next: PersonalState) {
  state = next
  for (const l of listeners) l()
}

export async function refresh(): Promise<void> {
  try {
    const d = await db()
    const [favorites, ticks] = await Promise.all([d.getAll('favorites'), d.getAll('ticks')])
    emit({
      ready: true,
      favorites: new Set(favorites.filter((f) => !f.deleted).map((f) => f.routeId)),
      ticks: ticks.filter((t) => !t.deleted).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    })
  } catch (err) {
    // 私密瀏覽等情況可能無法使用 IndexedDB
    emit({ ...state, ready: true, error: (err as Error).message })
  }
}

let started = false
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!started) {
    started = true
    void refresh()
  }
  return () => listeners.delete(listener)
}

export function usePersonal(): PersonalState {
  return useSyncExternalStore(subscribe, () => state)
}

/* ---------- 寫入 ---------- */

const now = () => new Date().toISOString()

export async function setFavorite(routeId: string, on: boolean): Promise<void> {
  const d = await db()
  const existing = await d.get('favorites', routeId)
  const t = now()
  await d.put('favorites', { routeId, createdAt: existing?.createdAt ?? t, updatedAt: t, deleted: !on })
  await refresh()
}

export async function addTick(input: Pick<Tick, 'routeId' | 'date' | 'style' | 'note'>): Promise<void> {
  const t = now()
  const tick: Tick = { id: newId(), ...input, createdAt: t, updatedAt: t }
  if (!tick.note) delete tick.note
  await (await db()).put('ticks', tick)
  await refresh()
}

export async function deleteTick(id: string): Promise<void> {
  const d = await db()
  const tick = await d.get('ticks', id)
  if (!tick) return
  await d.put('ticks', { ...tick, deleted: true, updatedAt: now() })
  await refresh()
}

/* ---------- 備份 ---------- */

export async function exportAll(): Promise<PersonalExport> {
  const d = await db()
  const [favorites, ticks] = await Promise.all([d.getAll('favorites'), d.getAll('ticks')])
  // 刪除標記也一起匯出，匯入另一台裝置時才不會把刪掉的紀錄救回來
  return { format: 'longdong-personal', version: 1, exportedAt: now(), favorites, ticks }
}

export async function importAll(data: PersonalExport): Promise<{ favorites: number; ticks: number }> {
  const d = await db()
  const [favorites, ticks] = await Promise.all([d.getAll('favorites'), d.getAll('ticks')])
  const fav = mergeRecords(favorites, data.favorites, (f) => f.routeId).changed
  const tk = mergeRecords(ticks, data.ticks, (t) => t.id).changed
  const tx = d.transaction(['favorites', 'ticks'], 'readwrite')
  await Promise.all([
    ...fav.map((f) => tx.objectStore('favorites').put(f)),
    ...tk.map((t) => tx.objectStore('ticks').put(t)),
    tx.done,
  ])
  await refresh()
  return { favorites: fav.length, ticks: tk.length }
}
