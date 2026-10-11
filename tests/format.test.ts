import { describe, expect, it } from 'vitest'
import type { Bolt, Route } from '../src/data/schema'
import { quickdraws, typeText } from '../src/format'

const bolt = (position: string, material = '316-TW'): Bolt => ({ position, material, tests: [] })
const route = (over: Partial<Route>): Route => ({
  id: 'r1', isFixture: false, name: { zh: '測試' }, bolts: [], anchors: [], anchorHardware: [], ...over,
})

describe('quickdraws', () => {
  it('bolt 加 anchor，共用的 bolt 也算', () => {
    const r = route({
      type: 'sport',
      bolts: [bolt('B01', '共用'), bolt('B02', '共用'), ...Array.from({ length: 14 }, (_, i) => bolt(`B${i + 3}`))],
      anchors: [bolt('A01', 'Ti-U'), bolt('A02', 'Ti-U')],
    })
    expect(quickdraws(r)).toBe(18)
    expect(typeText(r)).toBe('18快扣 運攀')
  })

  it('無 Anchor、天然固定點不算', () => {
    const r = route({ type: 'sport', bolts: [bolt('B01')], anchors: [bolt('A01', '無 Anchor'), bolt('A02', '天然固定點')] })
    expect(quickdraws(r)).toBe(1)
  })

  it('非運攀或沒有 bolt 時不顯示快扣數', () => {
    expect(typeText(route({ type: 'trad', anchors: [bolt('A01')] }))).toBe('傳攀')
    expect(typeText(route({ type: 'sport' }))).toBe('運攀')
    expect(typeText(route({ isFixture: true }))).toBe('固定點')
  })
})

import { gradeBand } from '../src/format'

describe('gradeBand', () => {
  it('依難度分區', () => {
    expect(gradeBand(36)).toBe('easy') // 5.9
    expect(gradeBand(40)).toBe('g10') // 5.10a
    expect(gradeBand(47)).toBe('g11') // 5.11d
    expect(gradeBand(48)).toBe('g12') // 5.12a
    expect(gradeBand(53)).toBe('g13') // 5.13b
    expect(gradeBand(undefined)).toBeUndefined()
  })
})
