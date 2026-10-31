/** 全螢幕 Topo 的縮放與平移。座標以舞台（可視區域）中心為原點，單位是螢幕像素 */

import { SCALE, type Crop, type RouteMarks } from './model'

export interface View {
  scale: number
  x: number
  y: number
}

export interface Size {
  w: number
  h: number
}

export const MAX_SCALE = 6

export const IDENTITY: View = { scale: 1, x: 0, y: 0 }

/** 照片（寬高比 aspect）在舞台裡縮到剛好放得下的大小 */
export function fitSize(stage: Size, aspect: number): Size {
  const w = Math.min(stage.w, stage.h * aspect)
  return { w, h: w / aspect }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 舞台上下被蓋住的高度（螢幕像素）：照片的上下緣可以拖到蓋住的東西外面 */
export interface Inset {
  top: number
  bottom: number
}

/**
 * 縮放限制在 1 到 MAX_SCALE；放大後照片的邊緣不能離開舞台的邊緣，沒放滿舞台的方向置中。
 * inset：照片的上緣可以往下拖到 top 下面、下緣往上拖到 bottom 上面（上下浮著按鈕時，照片邊緣也能拖出來編輯）。
 */
export function clampView(view: View, stage: Size, content: Size, inset: Inset = { top: 0, bottom: 0 }): View {
  const scale = clamp(view.scale, 1, MAX_SCALE)
  const lx = Math.max(0, (content.w * scale - stage.w) / 2)
  const half = (content.h * scale - stage.h) / 2
  return { scale, x: clamp(view.x, -lx, lx), y: clamp(view.y, Math.min(0, 0 - half - inset.bottom), Math.max(0, half + inset.top)) }
}

export interface Pt {
  x: number
  y: number
}

/**
 * 手指從 from 移到 to，兩指距離變成 ratio 倍：照片上原本在 from 的那一點跟著手指走到 to。
 * 單指拖曳就是 ratio 為 1。
 */
export function moveView(view: View, from: Pt, to: Pt, ratio: number, stage: Size, content: Size, inset?: Inset): View {
  const scale = clamp(view.scale * ratio, 1, MAX_SCALE)
  const f = scale / view.scale
  return clampView({ scale, x: to.x - (from.x - view.x) * f, y: to.y - (from.y - view.y) * f }, stage, content, inset)
}

/** 路線卡片放大到路線：路線佔的範圍外面留的邊（比例），顯示的寬高比限制，最多放大幾倍 */
const FOCUS_PAD = 0.25
const FOCUS_ASPECT: [number, number] = [0.8, 1.5]
const FOCUS_MAX_ZOOM = 2.2

/**
 * 路線卡片：只顯示照片上這條路線附近的一塊（照片的裁切範圍裡），路線放大成主角。
 * 座標同 Crop（萬分比）；寬高比、放大倍數在照片像素上算。沒有標記時就是原本的裁切範圍。
 */
export function routeCrop(photo: { width: number; height: number }, base: Crop, marks: RouteMarks | undefined): Crop {
  const pts = [...(marks?.line ?? []), ...Object.values(marks?.bolts ?? {})]
  if (pts.length === 0) return base
  const sx = photo.width / SCALE
  const sy = photo.height / SCALE
  const xs = pts.map(([x]) => x * sx)
  const ys = pts.map(([, y]) => y * sy)
  const [bx, by, bw, bh] = [base.x * sx, base.y * sy, base.w * sx, base.h * sy]
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const rw = Math.max(...xs) - minX
  const rh = Math.max(...ys) - minY
  let w = rw + 2 * Math.max(FOCUS_PAD * rw, 0.1 * bw)
  let h = rh + 2 * Math.max(FOCUS_PAD * rh, 0.1 * bh)
  // 太窄、太扁：放寬短的那一邊
  w = Math.max(w, h * FOCUS_ASPECT[0])
  h = Math.max(h, w / FOCUS_ASPECT[1])
  // 不放大太多（照片會糊）：等比例放大到夠大
  const grow = Math.max(1, bw / FOCUS_MAX_ZOOM / w, bh / FOCUS_MAX_ZOOM / h)
  w = Math.min(bw, w * grow)
  h = Math.min(bh, h * grow)
  // 以路線為中心，超出裁切範圍時往裡面推
  const x = clamp(minX + rw / 2 - w / 2, bx, bx + bw - w)
  const y = clamp(minY + rh / 2 - h / 2, by, by + bh - h)
  return { x: Math.round(x / sx), y: Math.round(y / sy), w: Math.round(w / sx), h: Math.round(h / sy) }
}
