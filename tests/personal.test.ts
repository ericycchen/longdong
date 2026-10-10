import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { mergeRecords, today, type Tick } from '../src/personal/model'
import { addTick, applyRecords, clearAll, deleteTick, exportAll, setFavorite } from '../src/personal/store'

const tick = (id: string, updatedAt: string, over: Partial<Tick> = {}): Tick => ({
  id, routeId: 'longdong/328ac2', date: '2026-10-01', style: 'redpoint', createdAt: '2026-10-01T00:00:00Z', updatedAt, ...over,
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

describe('store（IndexedDB）', () => {
  it('收藏、紀錄、刪除，舊資料不會蓋掉較新的刪除', async () => {
    await setFavorite('longdong/328ac2', true)
    await addTick({ routeId: 'longdong/328ac2', date: today(), style: 'onsight' })
    await addTick({ routeId: 'longdong/q3ek73', date: '2026-01-02', style: 'attempt', note: '第三 bolt 卡關' })

    const snapshot = await exportAll()
    expect(snapshot.favorites.map((f) => f.routeId)).toEqual(['longdong/328ac2'])
    expect(snapshot.ticks).toHaveLength(2)

    const removed = snapshot.ticks.find((t) => t.routeId === 'longdong/q3ek73')!
    await deleteTick(removed.id)
    await setFavorite('longdong/328ac2', false)

    // 例如另一台裝置送來較舊的版本
    expect(await applyRecords(snapshot.favorites, snapshot.ticks)).toEqual({ favorites: 0, ticks: 0 })
    const after = await exportAll()
    expect(after.ticks.find((t) => t.id === removed.id)?.deleted).toBe(true)
    expect(after.favorites[0].deleted).toBe(true)

    await clearAll()
    expect(await exportAll()).toMatchObject({ favorites: [], ticks: [] })
  })
})
