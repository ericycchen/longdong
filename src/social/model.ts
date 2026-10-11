/**
 * 公開的社群資料（評分、留言、暱稱），存在 Firebase Realtime Database 的 /v2 底下：
 *   /v2/profiles/<uid>              { name, updatedAt }
 *   /v2/ratings/<routeKey>/<uid>     { stars, feel?, updatedAt }   每人每條路線一筆
 *   /v2/comments/<routeKey>/<id>     { uid, text, createdAt, hidden? }
 *   /v2/reports/<id>                 { path, uid, reason?, createdAt }   檢舉，只有管理員看得到
 */

export const DB_URL = 'https://longdong.firebaseio.com'

/** Realtime Database 的 key 不能含 "/" "."：longdong/328ac2 → longdong:328ac2 */
export function routeKey(routeId: string): string {
  return routeId.replace(/\//g, ':').replace(/\./g, ',')
}

export type Feel = 'soft' | 'fair' | 'hard'

/** 體感難度；顯示文字見 i18n 的 feel.* */
export const FEELS: Feel[] = ['soft', 'fair', 'hard']


export interface Rating {
  stars: number
  feel?: Feel
  updatedAt: string
}

export interface Comment {
  id: string
  uid: string
  text: string
  /** 伺服器時間（毫秒） */
  createdAt: number
  hidden?: boolean
}

export interface Profile {
  name: string
  updatedAt: string
}

export interface RatingSummary {
  count: number
  average: number
  /** 各星等人數，index 0 = 1 星 */
  stars: number[]
  feel: Record<Feel, number>
}

export function summarize(ratings: Record<string, Rating> | undefined): RatingSummary | undefined {
  const list = Object.values(ratings ?? {}).filter((r) => r.stars >= 1 && r.stars <= 5)
  if (list.length === 0) return undefined
  const stars = [0, 0, 0, 0, 0]
  const feel: Record<Feel, number> = { soft: 0, fair: 0, hard: 0 }
  let total = 0
  for (const r of list) {
    stars[r.stars - 1]++
    total += r.stars
    if (r.feel) feel[r.feel]++
  }
  return { count: list.length, average: total / list.length, stars, feel }
}

/** 體感難度的多數意見，至少 3 人回答且過半才顯示，避免一兩個人就下定論 */
export function feelConsensus(summary: RatingSummary | undefined): Feel | undefined {
  if (!summary) return undefined
  const answered = summary.feel.soft + summary.feel.fair + summary.feel.hard
  if (answered < 3) return undefined
  const top = (Object.entries(summary.feel) as [Feel, number][]).sort((a, b) => b[1] - a[1])[0]
  return top[1] * 2 > answered ? top[0] : undefined
}

export const COMMENT_MAX = 1000
export const NAME_MAX = 30
