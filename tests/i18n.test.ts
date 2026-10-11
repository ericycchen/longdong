import { describe, expect, it } from 'vitest'
import { detectLang, localName, monthShort, monthTitle, translate } from '../src/i18n'
import { en } from '../src/i18n/en'
import { zh } from '../src/i18n/zh'

describe('i18n', () => {
  it('依系統語言偵測：zh 開頭用中文，其他用英文', () => {
    expect(detectLang(['zh-TW', 'en'])).toBe('zh')
    expect(detectLang(['zh-Hant'])).toBe('zh')
    expect(detectLang(['en-US', 'zh-TW'])).toBe('en')
    expect(detectLang(['ja'])).toBe('en')
    expect(detectLang([])).toBe('en')
  })

  it('兩份字典的 key 完全相同，且英文沒有留空（除了刻意留空的）', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    const empty = Object.entries(en).filter(([, v]) => v === '').map(([k]) => k)
    expect(empty).toEqual(['me.dayUnit'])
  })

  it('變數代入', () => {
    expect(translate('zh', 'count.routes', { n: 12 })).toBe('12 條路線')
    expect(translate('en', 'count.routes', { n: 12 })).toBe('12 routes')
  })

  it('名稱：英文模式以英文為主，沒有英文名時用中文', () => {
    expect(localName({ zh: '後門', en: 'Back Door' }, 'en')).toEqual({ main: 'Back Door', sub: '後門' })
    expect(localName({ zh: '後門', en: 'Back Door' }, 'zh')).toEqual({ main: '後門', sub: 'Back Door' })
    expect(localName({ zh: '瑩養午餐' }, 'en')).toEqual({ main: '瑩養午餐', sub: undefined })
  })

  it('月份', () => {
    expect(monthTitle('2026-10', 'zh')).toBe('2026 年 10 月')
    expect(monthTitle('2026-10', 'en')).toBe('October 2026')
    expect(monthShort('2026-01', 'en')).toBe('Jan')
  })
})
