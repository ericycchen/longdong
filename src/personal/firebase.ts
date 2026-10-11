/**
 * Firebase 登入與雲端同步。這個模組只在使用者登入（或曾經登入）時才以 dynamic import 載入，
 * 沒登入的人不需要下載 Firebase SDK，App 照樣離線可用。
 *
 * 使用舊站的 Firebase 專案（longdong），新資料放在 /v2/personal/<uid>，與舊站的路徑分開。
 */
import { initializeApp } from 'firebase/app'
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  getAuth,
  getRedirectResult,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthCredential,
  type AuthProvider,
  type User,
} from 'firebase/auth'
import { get, getDatabase, onValue, push, ref, remove, serverTimestamp, set, update, type Unsubscribe } from 'firebase/database'
import { routeKey, type Feel } from '../social/model'

const app = initializeApp({
  // 前端用的公開設定（不是密鑰）；存取權限由 Realtime Database 規則控管
  apiKey: 'AIzaSyC6UDLfbg6Ue3UQ2icFhhtKAEotoRux4Qc',
  authDomain: 'longdong.firebaseapp.com',
  databaseURL: 'https://longdong.firebaseio.com',
  projectId: 'project-2803619783974357321',
})

const auth = getAuth(app)
const db = getDatabase(app)

export type { User }

export function watchUser(callback: (user: User | null) => void): Unsubscribe {
  // 從 redirect 登入回來時，讓錯誤能被看見（成功的話 onAuthStateChanged 會處理）
  getRedirectResult(auth).catch((err) => console.warn('redirect sign-in failed', err))
  return onAuthStateChanged(auth, callback)
}

export type ProviderName = 'google' | 'facebook'

export const PROVIDER_LABEL: Record<ProviderName, string> = { google: 'Google', facebook: 'Facebook' }

function makeProvider(name: ProviderName): AuthProvider {
  if (name === 'facebook') {
    const p = new FacebookAuthProvider()
    p.addScope('email')
    return p
  }
  const p = new GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

function credentialFromError(name: ProviderName, err: unknown): AuthCredential | null {
  const e = err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
  return name === 'facebook' ? FacebookAuthProvider.credentialFromError(e) : GoogleAuthProvider.credentialFromError(e)
}

/**
 * 登入。同一個 Email 已經用另一種方式登入過時（專案設定為「同 Email 自動連結」），
 * 先用原本的方式登入，再把這次的登入方式連結到同一個帳號。
 * confirmLink 回傳 false 表示使用者取消。
 */
export async function signInWith(
  name: ProviderName,
  confirmLink: (email: string, existing: ProviderName) => boolean,
): Promise<void> {
  try {
    await signInWithPopup(auth, makeProvider(name))
  } catch (err) {
    const code = (err as { code?: string }).code
    // 彈出視窗被擋、或環境不支援（例如部分 iOS 主畫面 App）時改用整頁跳轉
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') {
      await signInWithRedirect(auth, makeProvider(name))
      return
    }
    if (code === 'auth/account-exists-with-different-credential') {
      const pending = credentialFromError(name, err)
      const email = (err as { customData?: { email?: string } }).customData?.email ?? ''
      const existing: ProviderName = name === 'google' ? 'facebook' : 'google'
      if (!pending || !confirmLink(email, existing)) return
      const result = await signInWithPopup(auth, makeProvider(existing))
      await linkWithCredential(result.user, pending)
      return
    }
    throw err
  }
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}

export function watchRemote(uid: string, callback: (value: unknown) => void, onError: (err: Error) => void): Unsubscribe {
  return onValue(ref(db, `v2/personal/${uid}`), (snap) => callback(snap.val()), onError)
}

export function writeRemote(paths: Record<string, unknown>): Promise<void> {
  return update(ref(db), paths)
}

/** 連線狀態（Realtime Database 內建的 .info/connected） */
export function watchConnected(callback: (connected: boolean) => void): Unsubscribe {
  return onValue(ref(db, '.info/connected'), (snap) => callback(snap.val() === true))
}

/* ---------- 社群：評分、留言、暱稱（讀取走 REST，見 social/store.ts） ---------- */

/** 第一次登入時建立暱稱（預設 Google 名稱），已有就不動。回傳目前的暱稱 */
export async function ensureProfile(uid: string, fallbackName: string): Promise<{ name: string; updatedAt: string }> {
  const r = ref(db, `v2/profiles/${uid}`)
  const snap = await get(r)
  if (snap.exists()) return snap.val()
  const profile = { name: (fallbackName || '岩友').slice(0, 30), updatedAt: new Date().toISOString() }
  await set(r, profile)
  return profile
}

export function saveProfile(uid: string, name: string): Promise<void> {
  return set(ref(db, `v2/profiles/${uid}`), { name, updatedAt: new Date().toISOString() })
}

export function saveRating(uid: string, routeId: string, rating: { stars: number; feel?: Feel; updatedAt: string } | null): Promise<void> {
  const r = ref(db, `v2/ratings/${routeKey(routeId)}/${uid}`)
  return rating ? set(r, JSON.parse(JSON.stringify(rating))) : remove(r)
}

export async function addComment(uid: string, routeId: string, text: string): Promise<void> {
  await push(ref(db, `v2/comments/${routeKey(routeId)}`), { uid, text, createdAt: serverTimestamp() })
}

export function deleteComment(routeId: string, id: string): Promise<void> {
  return remove(ref(db, `v2/comments/${routeKey(routeId)}/${id}`))
}

export async function reportComment(uid: string, routeId: string, id: string, reason: string): Promise<void> {
  await push(ref(db, 'v2/reports'), {
    path: `v2/comments/${routeKey(routeId)}/${id}`,
    uid,
    ...(reason ? { reason: reason.slice(0, 500) } : {}),
    createdAt: serverTimestamp(),
  })
}

/**
 * 刪除帳號：先刪除資料庫中屬於這個使用者的資料（paths 由呼叫端整理，值為 null），再刪除登入帳號。
 * 太久沒登入時 Firebase 會要求重新驗證，自動跳出登入視窗。
 */
export async function deleteAccount(paths: Record<string, null>): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('not signed in')
  await update(ref(db), paths)
  try {
    await deleteUser(user)
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/requires-recent-login') throw err
    const providerId = user.providerData[0]?.providerId
    await reauthenticateWithPopup(user, makeProvider(providerId === 'facebook.com' ? 'facebook' : 'google'))
    await deleteUser(user)
  }
}
