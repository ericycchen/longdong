import { describe, expect, it } from 'vitest'
import { parseSafetyHtml } from '../scripts/lib/safety'

const dots = (a: string, b: string, c: string) =>
  `<td class="s24" rowspan="3"><span style="color:${a};">●</span><span style="color:${b};">●</span><span style="color:${c};">●</span></td>`
const tr = (row: number, cells: string) =>
  `<tr style="height: 19px"><th id="123R${row}" style="height: 19px;"><div>${row + 1}</div></th><td># 1</td>${cells}</tr>`

describe('parseSafetyHtml', () => {
  it('以亮起的燈判斷評級，灰色為尚未評級', () => {
    const html = [
      tr(2, dots('#ffe3e3', '#fff2cc', '#6aa84f')),
      tr(3, '<td>B01</td>'),
      tr(5, dots('#ffe3e3', '#f1c232', '#d9ead3')),
      tr(8, dots('#CC0000', '#fff2cc', '#d9ead3')),
      tr(11, '<td class="s79" rowspan="3">●●●</td>'),
      tr(14, dots('#cc0000', '#f1c232', '#d9ead3')),
    ].join('')
    const { ratings, unreadable } = parseSafetyHtml(html, '123')
    expect([...ratings]).toEqual([
      [2, 'green'],
      [5, 'yellow'],
      [8, 'red'],
      [11, null],
    ])
    expect(unreadable).toEqual([14])
  })

  it('只讀指定分頁的列', () => {
    expect(parseSafetyHtml(tr(2, dots('#ffe3e3', '#fff2cc', '#6aa84f')), '999').ratings.size).toBe(0)
  })
})

import { parseTitleColor } from '../scripts/lib/safety'

describe('parseTitleColor', () => {
  it('讀出標題列儲存格的底色', () => {
    const html =
      '<style>.ritz .waffle .s0{border:1px;background-color:#CC0000;color:#fff;}.ritz .waffle .s6{background-color:#ffffff;}</style>' +
      '<tr><th id="123R0"><div>1</div></th><td class="s0">後門</td></tr><tr><th id="123R1"></th><td class="s6">分區</td></tr>'
    expect(parseTitleColor(html, '123')).toBe('#cc0000')
    expect(parseTitleColor(html, '999')).toBeUndefined()
  })
})
