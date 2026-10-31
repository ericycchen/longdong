import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Marks, TopoPhoto } from '../src/topo/model'
import { textWidth } from '../src/topo/annotate'
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
  it('看的時候標出起點（實心）與終點（空心）；編輯時不畫終點', () => {
    expect(count(render(1), /class="topo-start"/g)).toBe(2)
    expect(count(render(1), /class="topo-end"/g)).toBe(2)
    expect(render(1)).toContain('class="topo-end" cx="600" cy="100"')
    expect(count(render(1, { editing: true }), /class="topo-end"/g)).toBe(0)
  })

  it('solo：說明不避開其他路線的線，貼在編號旁邊', () => {
    const near: Marks = {
      a: { line: [[3000, 9000], [3000, 1000]] },
      b: { line: [[3150, 9000], [3150, 1000]] },
    }
    const nums = (s: string) => s.match(/-?\d+(\.\d+)?/g)!.map(Number)
    const side = (html: string) => {
      const badge = html.match(/<g class="topo-badge"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/)!
      const [x, y, w, h] = nums(badge.slice(1).join(' '))
      const spans = [...html.matchAll(/<tspan x="([\d.]+)" y="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])])
      const midY = spans.reduce((s, [, sy]) => s + sy, 0) / spans.length
      // 說明在編號的右邊或左邊、同一高度
      return Math.abs(midY - (y + h / 2)) < 1 && spans.every(([sx]) => sx > x + w || sx < x)
    }
    const html = (solo: boolean) => renderToStaticMarkup(createElement('svg', null, createElement(TopoLines, { photo, marks: near, labels, k: 1, info, highlight: 'a', solo })))
    expect(side(html(true))).toBe(true)
    expect(side(html(false))).toBe(false)
  })

  it('solo（路線卡片）：選到的路線標編號與說明，其他路線只標小的編號、變淡', () => {
    const html = render(0.5, { highlight: 'a', solo: true })
    expect(html).toContain('<g class="topo-badge">')
    expect(html).toMatch(/<g class="topo-badge small">.*>11</)
    // 其他路線的編號在線的下段（起點附近），畫面中間留給主角
    const small = html.match(/<g class="topo-badge small"><rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/)!
    expect(Number(small[1]) + Number(small[2]) / 2).toBeGreaterThan(photo.height * 0.7)
    expect(html).toContain('路線甲')
    expect(html).not.toContain('路線乙')
    expect(count(html, /topo-route kind-other dim/g)).toBeGreaterThan(0)
  })

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

  it('縮得很小，放不下的編號不標；選到的路線仍然標', () => {
    expect(count(render(60), /class="topo-badge"/g)).toBe(0)
    expect(count(render(60, { highlight: 'a' }), /class="topo-badge"/g)).toBe(1)
  })

  it('很短的線（從照片下緣出去的示意線，例如 565）：其他編號放好之後，有空位照樣標', () => {
    const withSketch: Marks = { ...marks, c: { line: [[1000, 9990], [1030, 9900], [1050, 9800]] } }
    const sketchLabels = new Map([...labels, ['c', '9']])
    const html = renderToStaticMarkup(createElement('svg', null, createElement(TopoLines, { photo, marks: withSketch, labels: sketchLabels, k: 1, info })))
    expect(html).toContain('>9<')
    expect(html).toContain('>10<')
    expect(html).toContain('>11<')
  })

  it('同一張 Topo 的編號、bolt、難度名稱、bolt 材質一起排：不論縮放，彼此都不重疊；名稱太長時換行', () => {
    // 很擠的一面牆：六條路線靠在一起，名稱很長，每條都有 bolt
    const crowded: Marks = {}
    const crowdedInfo = new Map<string, RouteInfo>()
    const crowdedLabels = new Map<string, string>()
    for (let i = 0; i < 6; i++) {
      const x = 2000 + i * 900
      crowded[`r${i}`] = { line: [[x, 9200], [x + 150, 5000], [x, 900]], bolts: { B01: [x + 100, 7500], B02: [x + 140, 4500], A01: [x, 1200] } }
      crowdedLabels.set(`r${i}`, String(i + 1))
      crowdedInfo.set(`r${i}`, { kind: i % 2 ? 'sport' : 'other', grade: '5.11c', name: `一條名字非常非常長的路線${i}`, bolts: { B01: '316-TW · 2007', B02: 'Ti-U · 2021', A01: '316-TW · 2019' } })
    }
    const ids = Object.keys(crowded)
    for (const k of [0.4, 0.8, 1.5, 3]) {
      const html = renderToStaticMarkup(createElement('svg', null, createElement(TopoLines, { photo, marks: crowded, labels: crowdedLabels, k, info: crowdedInfo, highlight: 'r2', bolts: ids })))
      const boxes: { x: number; y: number; w: number; h: number; what: string }[] = []
      for (const m of html.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
        const [x, y, w, h] = m.slice(1).map(Number)
        boxes.push({ x, y, w, h, what: 'rect' })
      }
      for (const m of html.matchAll(/<tspan x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]+)</g)) {
        const [cx, cy] = [Number(m[1]), Number(m[2])]
        const w = textWidth(m[3], 10) * k
        const h = 12.5 * k
        boxes.push({ x: cx - w / 2, y: cy - h / 2, w, h, what: m[3] })
      }
      expect(boxes.length).toBeGreaterThan(6)
      for (let a = 0; a < boxes.length; a++)
        for (let b = a + 1; b < boxes.length; b++) {
          const [p, q] = [boxes[a], boxes[b]]
          const hit = p.x < q.x + q.w - 0.01 && q.x < p.x + p.w - 0.01 && p.y < q.y + q.h - 0.01 && q.y < p.y + p.h - 0.01
          expect(hit, `k=${k}: ${p.what} 和 ${q.what} 重疊`).toBe(false)
        }
      // 擠的時候換方向、換行，盡量都顯示：每條路線都有難度，大部分有名稱，bolt 的材質放不下一行時分兩行
      const lines = [...html.matchAll(/<tspan[^>]*>([^<]+)</g)].map((m) => m[1])
      if (k === 1.5) {
        expect(lines.filter((t) => t === '5.11c')).toHaveLength(6)
        expect(lines.filter((t) => t.startsWith('一條名字')).length).toBeGreaterThanOrEqual(5)
        expect(lines.some((t) => t === '的路線1')).toBe(true)
      }
      if (k === 3) expect(lines).toContain('2007')
    }
  })
})
