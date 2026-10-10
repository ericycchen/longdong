/**
 * Firebase 登入與雲端同步。這個模組只在使用者登入（或曾經登入）時才以 dynamic import 載入，
 * 沒登入的人不需要下載 Firebase SDK，App 照樣離線可用。
 *
 * 使用舊站的 Firebase 專案（longdong），新資料放在 /v2/personal/<uid>，與舊站的路徑分開。
 */
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { getDatabase, onValue, ref, update, type Unsubscribe } from 'firebase/database'

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

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (err) {
    const code = (err as { code?: string }).code
    // 彈出視窗被擋、或環境不支援（例如部分 iOS 主畫面 App）時改用整頁跳轉
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') {
      await signInWithRedirect(auth, provider)
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
