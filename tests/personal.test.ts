import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { mergeRecords, parseExport, today, type Tick } from '../src/personal/model'
import { ticksToCsv } from '../src/personal/files'
import { addTick, deleteTick, exportAll, importAll, refresh, setFavorite } from '../src/personal/store'
import type { RouteRef } from '../src/data/dataset'

const tick = (id: string, updatedAt: string, over: Partial<Tick> = {}): Tick => ({
  id, routeId: 'longdong/523', date: '2026-10-01', style: 'redpoint', createdAt: '2026-10-01T00:00:00Z', updatedAt, ...over,
})

describe('mergeRecords', () => {
  it('同一筆取較新者，刪除標記也會蓋過舊資料', () => {
    const current = [tick('a', '2026-10-01T00:00:00Z'), tick('b', '2026-10-05T00:00:00Z')]
    const incoming = [
      tick('a', '2026-10-03T00:00:00Z', { deleted: true }),
      tick('b', '2026-10-02T00:00:00Z', { note: '舊的' }),
      tick('c', '2026-10-04T00:00:00Z'),
    ]
    const { merged, changed } = mergeRecords(current, incoming, (t) => t.id)
    expect(changed.map((t) => t.id)).toEqual(['a', 'c'])
    expect(merged.find((t) => t.id === 'a')?.deleted).toBe(true)
    expect(merged.find((t) => t.id === 'b')?.note).toBeUndefined()
  })
})

describe('parseExport', () => {
  it('拒絕格式不符的檔案', () => {
    expect(() => parseExport({ foo: 1 })).toThrow(/格式不符/)
    expect(() => parseExport({ format: 'longdong-personal', version: 1, favorites: [], ticks: [{ id: 'x' }] })).toThrow(
      /攀登紀錄/,
    )
  })
})

describe('ticksToCsv', () => {
  it('包含路線資訊並處理逗號與引號', () => {
    const ref = {
      route: { id: 'longdong/523', number: '523', name: { zh: 'V槽', en: 'V-Groove' }, grade: '5.10b', type: 'sport' },
      area: { name: { zh: '校門口' } },
      sector: { name: { zh: '人面岩' } },
    } as unknown as RouteRef
    const csv = ticksToCsv([tick('a', 'x', { note: '好爬, "推薦"' })], () => ref)
    expect(csv.startsWith('﻿日期,')).toBe(true)
    expect(csv).toContain('2026-10-01,523,V槽,V-Groove,5.10b,sport,校門口,人面岩,Redpoint,"好爬, ""推薦""",longdong/523')
  })
})

describe('store（IndexedDB）', () => {
  it('收藏、紀錄、刪除、匯出再匯入', async () => {
    await setFavorite('longdong/523', true)
    await addTick({ routeId: 'longdong/523', date: today(), style: 'onsight' })
    await addTick({ routeId: 'longdong/45', date: '2026-01-02', style: 'attempt', note: '第三 bolt 卡關' })

    const backup = await exportAll()
    expect(backup.favorites.map((f) => f.routeId)).toEqual(['longdong/523'])
    expect(backup.ticks).toHaveLength(2)

    const removed = backup.ticks.find((t) => t.routeId === 'longdong/45')!
    await deleteTick(removed.id)
    await setFavorite('longdong/523', false)

    // 舊備份匯入後不會把已刪除（較新）的資料救回來
    const result = await importAll(parseExport(JSON.parse(JSON.stringify(backup))))
    expect(result).toEqual({ favorites: 0, ticks: 0 })
    const after = await exportAll()
    expect(after.ticks.find((t) => t.id === removed.id)?.deleted).toBe(true)
    expect(after.favorites[0].deleted).toBe(true)
    await refresh()
  })
})
