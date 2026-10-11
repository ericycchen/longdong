import { deleteAccount, withCloud } from '../personal/sync'
import { COMMENT_MAX, NAME_MAX, type Comment, type Feel, type Rating } from './model'
import { t } from '../i18n'
import { get, loadComments, loadRatings, setLocalProfile, setLocalRating } from './store'

/** 評分；rating 為 null 時刪除自己的評分 */
export async function rate(routeId: string, input: { stars: number; feel?: Feel } | null): Promise<void> {
  const { m, uid } = await withCloud()
  const rating: Rating | null = input ? { ...input, updatedAt: new Date().toISOString() } : null
  await m.saveRating(uid, routeId, rating)
  setLocalRating(uid, routeId, rating)
}

export async function postComment(routeId: string, text: string): Promise<void> {
  const body = text.trim()
  if (!body) return
  if (body.length > COMMENT_MAX) throw new Error(t('comments.tooLong', { n: COMMENT_MAX }))
  const { m, uid } = await withCloud()
  await m.addComment(uid, routeId, body)
  await loadComments(routeId)
}

export async function removeComment(routeId: string, id: string): Promise<void> {
  const { m } = await withCloud()
  await m.deleteComment(routeId, id)
  await loadComments(routeId)
}

export async function report(routeId: string, id: string, reason: string): Promise<void> {
  const { m, uid } = await withCloud()
  await m.reportComment(uid, routeId, id, reason.trim())
}

export async function rename(name: string): Promise<void> {
  const value = name.trim()
  if (!value) throw new Error(t('name.empty'))
  if (value.length > NAME_MAX) throw new Error(t('name.tooLong', { n: NAME_MAX }))
  const { m, uid } = await withCloud()
  await m.saveProfile(uid, value)
  setLocalProfile(uid, { name: value, updatedAt: new Date().toISOString() })
}

/**
 * 刪除我的帳號：個人紀錄、暱稱、所有評分與留言，最後刪除登入帳號。
 * 以最新的雲端資料找出屬於自己的評分與留言，一次刪除。
 */
export async function deleteMyAccount(): Promise<void> {
  const { uid } = await withCloud()
  const [ratings, comments] = await Promise.all([
    get<Record<string, Record<string, Rating>>>('v2/ratings'),
    get<Record<string, Record<string, Omit<Comment, 'id'>>>>('v2/comments'),
  ])
  const paths: Record<string, null> = {
    [`v2/personal/${uid}`]: null,
    [`v2/profiles/${uid}`]: null,
  }
  for (const [route, byUser] of Object.entries(ratings ?? {})) {
    if (byUser[uid]) paths[`v2/ratings/${route}/${uid}`] = null
  }
  for (const [route, list] of Object.entries(comments ?? {})) {
    for (const [id, c] of Object.entries(list)) if (c.uid === uid) paths[`v2/comments/${route}/${id}`] = null
  }
  await deleteAccount(paths)
  await loadRatings(true)
}
