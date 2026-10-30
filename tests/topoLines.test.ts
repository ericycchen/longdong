import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Marks, TopoPhoto } from '../src/topo/model'
import { TopoLines, type RouteInfo } from '../src/topo/TopoView'

const photo = { id: 'p', sector: 's', uid: 'u', width: 2000, height: 1000, image: 'x', createdAt: 0 } as TopoPhoto
const marks: Marks = {
  a: { line: [[3000, 9000], [3200, 5000], [3000, 1000]], bolts: { B01: [3100, 7000], A01: [3000, 1500] } },
  b: { line: [[6000, 9000], [6100, 5000], [6000, 1000]] },
}
const labels = new Map([['a', '10'], ['b', '11']])
const info = new Map<string, RouteInfo>([
  ['a', { kind: 'sport', grade: '5.10a', name: '路線甲', bolts: { B01: '316-TW · 2007', A01: 'Ti-U · 2021' } }],
  ['b', { kind: 'other', grade: '5.11b', name: '路線乙', bolts: {} }],
])
const render = (k: number, extra: object = {}) => renderToStaticMarkup(createElement('svg', null, createElement(TopoLines, { photo, marks, labels, k, info, ...extra })))
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length

describe('Topo 標記的自動排版（畫面上的大小）', () => {
  it('顏色依種類：運攀藍色，其他（傳攀、上方架繩、抱石、混合）紅色', () => {
    const html = render(1)
    expect(html).toContain('topo-route kind-sport')
    expect(html).toContain('topo-route kind-other')
    expect(html).not.toContain('kind-trad')
  })

  it('選到的路線一律顯示難度與名稱；其他的要線夠長（放大）才顯示', () => {
    // 線在畫面上很長（k 小 = 放大）：兩條都顯示難度與名稱
    expect(render(0.5, { highlight: 'a' })).toContain('路線乙')
    // 縮小（線在畫面上很短）：只有選到的顯示（名稱放不下時先留難度）；其他路線只有編號
    const small = render(8, { highlight: 'a' })
    expect(small).toContain('5.10a')
    expect(small).not.toContain('5.11b')
    expect(small).not.toContain('路線乙')
  })

  it('bolt、anchor 只在 bolts 指定的路線顯示，放大才有材質與年份', () => {
    expect(count(render(1), /class="topo-bolt/g)).toBe(0)
    const html = render(1, { bolts: ['a'] })
    expect(count(html, /class="topo-bolt/g)).toBe(2)
    expect(html).toContain('316-TW · 2007')
    expect(html).toContain('××')
    expect(html).toContain('× B01')
  })

  it('編輯時：線比較細、沒有難度名稱等說明，編號不蓋在選到的路線的點上，bolt 照樣顯示', () => {
    const k = 2
    const html = render(k, { highlight: 'a', bolts: ['a'], editing: true })
    expect(html).not.toContain('topo-note')
    expect(count(html, /class="topo-bolt/g)).toBe(2)
    const widths = [...html.matchAll(/class="topo-line" d="[^"]*" stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]) / k)
    expect(widths.length).toBeGreaterThan(0)
    expect(Math.max(...widths)).toBeLessThanOrEqual(2)
    const points = marks.a.line!.map(([x, y]) => [(x * photo.width) / 10000, (y * photo.height) / 10000])
    for (const m of html.matchAll(/class="topo-badge"><rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
      const [x, y, w, h] = m.slice(1).map(Number)
      for (const [px, py] of points) expect(px > x - 12 * k && px < x + w + 12 * k && py > y - 12 * k && py < y + h + 12 * k).toBe(false)
    }
  })

  it('分岔的路線：編號各自標在自己的岔線上，不標在共用的前段', () => {
    // 共用的前段比岔線長：整條線的正中間落在前段（x = 1000 像素）
    const fork: Marks = {
      a: { line: [[5000, 9500], [5000, 3000], [4000, 1000]] },
      b: { line: [[5000, 9500], [5000, 3000], [6000, 1000]] },
    }
    const html = renderToStaticMarkup(createElement('svg', null, createElement(TopoLines, { photo, marks: fork, labels, k: 1 })))
    const centers = [...html.matchAll(/class="topo-badge"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map((m) => Number(m[1]) + Number(m[3]) / 2)
    expect(centers).toHaveLength(2)
    expect(centers[0]).toBeLessThan(1000)
    expect(centers[1]).toBeGreaterThan(1000)
  })

  it('編號、bolt 畫在所有路線的線上面，不會被別條線蓋住', () => {
    const html = render(1, { bolts: ['a'] })
    expect(html.lastIndexOf('class="topo-line"')).toBeLessThan(html.indexOf('class="topo-badge"'))
    expect(html.lastIndexOf('class="topo-line"')).toBeLessThan(html.indexOf('class="topo-bolt'))
  })

  it('縮得很小，太短的路線不標編號；選到的路線仍然標', () => {
    expect(count(render(60), /class="topo-badge"/g)).toBe(0)
    expect(count(render(60, { highlight: 'a' }), /class="topo-badge"/g)).toBe(1)
  })
})
