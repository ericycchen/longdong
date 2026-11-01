import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { expect, it } from 'vitest'

// 1.0.284 移除過收藏：那時新建的資料庫（版本 2）只有 ticks、best。store 要能補上 favorites，原有紀錄保留
it('沒有 favorites 的舊資料庫：補建後可以加入最愛，紀錄還在', async () => {
  const old = await openDB('longdong-personal', 2, {
    upgrade(d) {
      d.createObjectStore('ticks', { keyPath: 'id' }).createIndex('byRoute', 'routeId')
      d.createObjectStore('best', { keyPath: 'routeId' })
    },
  })
  await old.put('ticks', { id: 't1', routeId: 'longdong/aaaaaa', date: '2026-10-31', style: 'redpoint', createdAt: 'a', updatedAt: 'a' })
  old.close()

  const { exportAll, setFavorite } = await import('../src/personal/store')
  await setFavorite('longdong/bbbbbb', true)
  const data = await exportAll()
  expect(data.favorites.map((f) => f.routeId)).toEqual(['longdong/bbbbbb'])
  expect(data.ticks.map((t) => t.id)).toEqual(['t1'])
})
