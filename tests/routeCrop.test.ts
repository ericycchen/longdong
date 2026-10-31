import { describe, expect, it } from 'vitest'
import { FULL_CROP } from '../src/topo/model'
import { clampView, routeCrop } from '../src/topo/viewport'

const photo = { width: 2000, height: 1500 }
const inside = (c: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w + 1 && c.y + c.h <= b.y + b.h + 1

describe('routeCrop', () => {
  it('沒有標記：整個裁切範圍', () => {
    expect(routeCrop(photo, FULL_CROP, undefined)).toEqual(FULL_CROP)
    expect(routeCrop(photo, FULL_CROP, { line: [] })).toEqual(FULL_CROP)
  })

  it('放大到路線附近，路線整條看得到', () => {
    const line: [number, number][] = [
      [3000, 9000],
      [3200, 6000],
      [3500, 3000],
    ]
    const c = routeCrop(photo, FULL_CROP, { line })
    expect(c.w).toBeLessThan(FULL_CROP.w)
    for (const [x, y] of line) {
      expect(x).toBeGreaterThan(c.x)
      expect(x).toBeLessThan(c.x + c.w)
      expect(y).toBeGreaterThan(c.y)
      expect(y).toBeLessThan(c.y + c.h)
    }
    expect(inside(c, FULL_CROP)).toBe(true)
  })

  it('又高又窄的路線：寬高比不會比 0.8 更窄', () => {
    const c = routeCrop(photo, FULL_CROP, { line: [[5000, 9000], [5000, 1000]] })
    const ratio = (c.w * photo.width) / (c.h * photo.height)
    expect(ratio).toBeGreaterThanOrEqual(0.79)
  })

  it('很短的路線：最多放大 2.2 倍', () => {
    const c = routeCrop(photo, FULL_CROP, { bolts: { B01: [5000, 5000] } })
    expect(c.w).toBeGreaterThanOrEqual(Math.floor(FULL_CROP.w / 2.2) - 1)
    expect(c.h).toBeGreaterThanOrEqual(Math.floor(FULL_CROP.h / 2.2) - 1)
  })

  it('靠邊的路線：不超出照片的裁切範圍', () => {
    const base = { x: 1000, y: 1000, w: 8000, h: 8000 }
    const c = routeCrop(photo, base, { line: [[1100, 8900], [1200, 7000]] })
    expect(inside(c, base)).toBe(true)
  })
})

describe('clampView inset', () => {
  const stage = { w: 400, h: 800 }
  const content = { w: 400, h: 800 }
  it('沒有 inset：沒放大時不能上下移動', () => {
    expect(clampView({ scale: 1, x: 0, y: -300 }, stage, content).y).toBe(0)
  })
  it('有 inset：照片的下緣可以拖到下面的按鈕上面、上緣拖到上面的按鈕下面', () => {
    const inset = { top: 70, bottom: 80 }
    expect(clampView({ scale: 1, x: 0, y: -300 }, stage, content, inset).y).toBe(-80)
    expect(clampView({ scale: 1, x: 0, y: 300 }, stage, content, inset).y).toBe(70)
    expect(clampView({ scale: 2, x: 0, y: -2000 }, stage, content, inset).y).toBe(-480)
  })
  it('照片比舞台矮很多：已經露出來，維持置中', () => {
    expect(clampView({ scale: 1, x: 0, y: -300 }, stage, { w: 400, h: 300 }, { top: 70, bottom: 80 }).y).toBe(0)
  })
})
