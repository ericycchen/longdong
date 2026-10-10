import { routeKey } from '../social/model'
import { mergeRecords, type Favorite, type Tick } from './model'

/** 雲端（Realtime Database）上一個使用者的資料：/v2/personal/<uid> */
export interface RemotePersonal {
  favorites?: Record<string, Favorite>
  ticks?: Record<string, Tick>
}

/** 收藏以路線 key 存放（與評分、留言相同規則） */
export const favoriteKey = routeKey

export function favoritePath(uid: string, routeId: string): string {
  return `v2/personal/${uid}/favorites/${favoriteKey(routeId)}`
}

export function tickPath(uid: string, id: string): string {
  return `v2/personal/${uid}/ticks/${id}`
}

/** Realtime Database 不接受 undefined，寫入前去掉 */
export function clean<T extends object>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T
}

/**
 * 比對本機與雲端，回傳各自需要更新的紀錄（同一筆以 updatedAt 較新者為準）：
 * - toLocal：雲端較新或本機沒有 → 寫入本機
 * - toRemote：本機較新或雲端沒有 → 以 multi-path update 寫入雲端
 */
export function reconcile(
  uid: string,
  local: { favorites: Favorite[]; ticks: Tick[] },
  remote: RemotePersonal | null,
): { toLocal: { favorites: Favorite[]; ticks: Tick[] }; toRemote: Record<string, unknown> } {
  const remoteFavorites = Object.values(remote?.favorites ?? {})
  const remoteTicks = Object.values(remote?.ticks ?? {})

  const toLocal = {
    favorites: mergeRecords(local.favorites, remoteFavorites, (f) => f.routeId).changed,
    ticks: mergeRecords(local.ticks, remoteTicks, (t) => t.id).changed,
  }

  const toRemote: Record<string, unknown> = {}
  for (const f of mergeRecords(remoteFavorites, local.favorites, (f) => f.routeId).changed) {
    toRemote[favoritePath(uid, f.routeId)] = clean(f)
  }
  for (const t of mergeRecords(remoteTicks, local.ticks, (t) => t.id).changed) {
    toRemote[tickPath(uid, t.id)] = clean(t)
  }
  return { toLocal, toRemote }
}
