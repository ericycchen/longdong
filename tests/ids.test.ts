import { createRequire } from 'node:module'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { Route } from '../src/data/schema'
import { checkRouteIds } from '../scripts/lib/ids'
import { ROUTE_ID, parseAreaSheet } from '../scripts/lib/parse'

const appsScript = createRequire(import.meta.url)('../apps-script/RouteIds.gs') as {
  randomId: () => string
  newUniqueId: (used: Record<string, boolean>) => string
  isRouteRow: (no: string, name: string) => boolean
}

const route = (id: string, zh = id): Route =>
  ({ id, isFixture: false, name: { zh }, bolts: [], anchors: [], anchorHardware: [] }) as Route

describe('Apps Script', () => {
  it('產生的 ID 符合匯入程式的格式', () => {
    for (let i = 0; i < 500; i++) expect(appsScript.randomId()).toMatch(ROUTE_ID)
  })

  it('不會產生重複的 ID', () => {
    const used: Record<string, boolean> = {}
    const ids = Array.from({ length: 2000 }, () => appsScript.newUniqueId(used))
    expect(new Set(ids).size).toBe(2000)
  })

  it('只替路線列產生 ID', () => {
    expect(appsScript.isRouteRow('# 523', 'V槽')).toBe(true)
    expect(appsScript.isRouteRow('314.1', '左翼')).toBe(true)
    expect(appsScript.isRouteRow('', '')).toBe(false)
    expect(appsScript.isRouteRow('316-TW', '316 - 台製')).toBe(false)
  })
})

describe('parseAreaSheet 讀取「路線ID」欄', () => {
  const header = ['分區', '路線編號', '路線名稱', '難度', '路線種類', '高度', '首攀', '首攀日期', '路線資訊描述', '安全評級',
    'B01', 'A01', 'Anchor 配件', 'Bolt 統計', '路線狀態', '日期', '備註', '路線ID']
  const csv = (rows: string[][]) => Papa.unparse([['  後門\n  Back Door'], header, ...rows])
  const r = (no: string, name: string, id: string) => {
    const row = header.map(() => '')
    row[1] = no
    row[2] = name
    row[17] = id
    return row
  }
  const opts = { cragId: 'longdong', areaId: 'back-door', expectedZh: '後門' }

  it('用「路線ID」欄當 ID', () => {
    const area = parseAreaSheet(csv([r('# 1', 'ㄅ', '7kq2mx'), r('# 0', '私設固定點', 'h3w9tc')]), opts)
    expect(area.hasIdColumn).toBe(true)
    expect(area.idErrors).toEqual([])
    expect(area.sectors.flatMap((s) => s.routes.map((x) => x.id))).toEqual(['longdong/7kq2mx', 'longdong/h3w9tc'])
  })

  it('缺 ID 或格式錯誤時回報', () => {
    const area = parseAreaSheet(csv([r('# 1', 'ㄅ', ''), r('# 2', 'ㄆ', 'ABC')]), opts)
    expect(area.idErrors).toHaveLength(2)
    expect(area.idErrors[0]).toMatch(/缺少路線ID/)
    expect(area.idErrors[1]).toMatch(/格式不對/)
  })
})

describe('checkRouteIds', () => {
  it('Sheet ID 不可重複', () => {
    expect(checkRouteIds('sheet', [route('longdong/aaaaaa', '甲'), route('longdong/aaaaaa', '乙')], undefined, [])).toEqual([
      '路線ID longdong/aaaaaa 重複：甲、乙',
    ])
  })

  it('從舊規則切換時不檢查消失', () => {
    const prev = { idSource: 'legacy' as const, routeIds: ['longdong/523'] }
    expect(checkRouteIds('sheet', [route('longdong/7kq2mx')], prev, [])).toEqual([])
  })

  it('已發布的 Sheet ID 消失時擋下，列入 retired 則放行', () => {
    const prev = { idSource: 'sheet' as const, routeIds: ['longdong/7kq2mx', 'longdong/h3w9tc'] }
    const now = [route('longdong/7kq2mx')]
    expect(checkRouteIds('sheet', now, prev, [])).toHaveLength(1)
    expect(checkRouteIds('sheet', now, prev, ['longdong/h3w9tc'])).toEqual([])
  })
})
