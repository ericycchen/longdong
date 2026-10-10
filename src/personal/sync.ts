import { useSyncExternalStore } from 'react'
import { favoritePath, reconcile, tickPath, clean, type RemotePersonal } from './reconcile'
import { applyRecords, clearAll, exportAll, onLocalWrite } from './store'
import { setLocalProfile } from '../social/store'

/**
 * 雲端同步：登入 Google 後，收藏與攀登紀錄自動同步到 Firebase（/v2/personal/<uid>）。
 *
 * 本機（IndexedDB）一直是主要資料來源，沒網路也能記錄；
 * 每次連上雲端（登入、開啟 App、其他裝置有變動）都雙向合併，同一筆以 updatedAt 較新者為準。
 */

export interface CloudState {
  status: 'off' | 'loading' | 'signed-out' | 'signed-in'
  user?: { uid: string; name: string; email: string }
  connected: boolean
  syncing: boolean
  lastSync?: string
  error?: string
}

let state: CloudState = { status: 'off', connected: false, syncing: false }
const listeners = new Set<() => void>()
function set(patch: Partial<CloudState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// 記住這台裝置曾經登入過：下次開啟時才自動載入 Firebase；沒登入過的人完全不載入
const ENABLED_KEY = 'longdong.cloud'
const LAST_UID_KEY = 'longdong.cloud.uid'
const storage = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* 私密瀏覽等情況，忽略 */
    }
  },
}

type FirebaseModule = typeof import('./firebase')
let fb: Promise<FirebaseModule> | undefined
let stopRemote: (() => void) | undefined

function load(): Promise<FirebaseModule> {
  if (fb) return fb
  set({ status: 'loading' })
  fb = import('./firebase').then((m) => {
    m.watchConnected((connected) => set({ connected }))
    m.watchUser((user) => void onUser(m, user))
    return m
  })
  fb.catch((err: Error) => {
    fb = undefined
    set({ status: 'off', error: `無法載入登入功能（${err.message}）` })
  })
  return fb
}

/** App 啟動時呼叫：曾經登入過才載入 Firebase 並恢復同步 */
export function startCloud(): void {
  if (storage.get(ENABLED_KEY)) void load()
  onLocalWrite((w) => void push(w))
}

export async function signIn(): Promise<void> {
  set({ error: undefined })
  try {
    const m = await load()
    storage.set(ENABLED_KEY, '1')
    await m.signInWithGoogle()
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    set({ error: `登入失敗（${code ?? (err as Error).message}）` })
  }
}

/** 登出：收藏與紀錄都在雲端，清除這台裝置上的副本 */
export async function signOut(): Promise<void> {
  const m = await load()
  stopRemote?.()
  stopRemote = undefined
  await m.signOutUser()
  storage.set(ENABLED_KEY, null)
  storage.set(LAST_UID_KEY, null)
  await clearAll()
}

/** 已登入時回傳 Firebase 模組與 uid，給評分、留言等寫入功能使用 */
export async function withCloud(): Promise<{ m: FirebaseModule; uid: string }> {
  if (state.status !== 'signed-in' || !state.user || !fb) throw new Error('請先登入')
  return { m: await fb, uid: state.user.uid }
}

async function onUser(m: FirebaseModule, user: import('./firebase').User | null) {
  stopRemote?.()
  stopRemote = undefined
  if (!user) {
    set({ status: 'signed-out', user: undefined, syncing: false })
    return
  }

  // 紀錄只在登入時使用：裝置上若留有別的帳號的資料，先清掉再載入這個帳號的
  if (storage.get(LAST_UID_KEY) !== user.uid) await clearAll()
  storage.set(LAST_UID_KEY, user.uid)
  m.ensureProfile(user.uid, user.displayName ?? '')
    .then((profile) => setLocalProfile(user.uid, profile))
    .catch((err: Error) => console.warn('profile', err))

  set({
    status: 'signed-in',
    user: { uid: user.uid, name: user.displayName ?? '', email: user.email ?? '' },
    syncing: true,
    error: undefined,
  })
  stopRemote = m.watchRemote(
    user.uid,
    (value) => void sync(m, user.uid, value as RemotePersonal | null),
    (err) => set({ syncing: false, error: `同步失敗（${err.message}）` }),
  )
}

/** 雲端有資料（首次載入或其他裝置變動）時，雙向合併 */
async function sync(m: FirebaseModule, uid: string, remote: RemotePersonal | null) {
  try {
    set({ syncing: true })
    const local = await exportAll()
    const { toLocal, toRemote } = reconcile(uid, local, remote)
    await applyRecords(toLocal.favorites, toLocal.ticks)
    if (Object.keys(toRemote).length) await m.writeRemote(toRemote)
    set({ syncing: false, lastSync: new Date().toISOString(), error: undefined })
  } catch (err) {
    set({ syncing: false, error: `同步失敗（${(err as Error).message}）` })
  }
}

/** 本機有新寫入時，立即送到雲端（離線時由 Firebase SDK 暫存，或在下次開啟時合併） */
async function push(w: { favorite: import('./model').Favorite } | { tick: import('./model').Tick }) {
  if (state.status !== 'signed-in' || !state.user || !fb) return
  const m = await fb
  const uid = state.user.uid
  const paths =
    'favorite' in w
      ? { [favoritePath(uid, w.favorite.routeId)]: clean(w.favorite) }
      : { [tickPath(uid, w.tick.id)]: clean(w.tick) }
  m.writeRemote(paths).catch((err: Error) => set({ error: `同步失敗（${err.message}）` }))
}
