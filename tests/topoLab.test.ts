import { describe, expect, it } from 'vitest'
import { commit, parseSaved, redo, removePoint, serialize, startHistory, undo } from '../src/topo/lab'
import { toPoint, type Marks } from '../src/topo/model'

const A = 'longdong/abc123'
const B = 'longdong/def456'
const marks: Marks = {
  [A]: { line: [toPoint(0.5, 0.9), toPoint(0.45, 0.5), toPoint(0.5, 0.1)], bolts: { B01: toPoint(0.5, 0.8) } },
  [B]: { line: [toPoint(0.2, 0.9), toPoint(0.25, 0.4)] },
}

describe('Topo 實驗室：存起來再讀回來，路線位置完全一致', () => {
  it('線段與 bolt 都一樣', () => {
    expect(parseSaved(serialize(marks))).toEqual(marks)
  })

  it('格式不對時丟出錯誤，不猜', () => {
    expect(() => parseSaved('[]')).toThrow()
    expect(() => parseSaved('{"longdong:abc123":{"line":"1,2 x"}}')).toThrow()
    expect(() => parseSaved('{"longdong:abc123":{"bolts":{"B01":"1;2"}}}')).toThrow()
    expect(() => parseSaved('{"longdong:abc123":{"line":"1,2 3,4","color":"red"}}')).toThrow()
    expect(() => parseSaved('not json')).toThrow()
  })
})

describe('Topo 實驗室：刪除點', () => {
  it('只刪掉那一點，其他路線不動', () => {
    const next = removePoint(marks, A, 1)
    expect(next[A].line).toEqual([marks[A].line![0], marks[A].line![2]])
    expect(next[A].bolts).toEqual(marks[A].bolts)
    expect(next[B]).toEqual(marks[B])
  })

  it('刪到沒有點就沒有線，bolt 留著', () => {
    const one: Marks = { [A]: { line: [toPoint(0.1, 0.1)], bolts: { B01: toPoint(0.5, 0.8) } } }
    expect(removePoint(one, A, 0)[A]).toEqual({ bolts: { B01: toPoint(0.5, 0.8) } })
  })
})

describe('Topo 實驗室：復原、重做', () => {
  it('復原回到上一步，重做再回來；新的修改清掉重做', () => {
    const h1 = commit(startHistory({}), marks)
    const h2 = commit(h1, removePoint(marks, A, 0))
    expect(undo(h2).present).toEqual(marks)
    expect(redo(undo(h2)).present).toEqual(h2.present)
    expect(commit(undo(h2), {}).future).toEqual([])
  })

  it('沒有變化的修改不留一筆復原', () => {
    const h = commit(startHistory(marks), structuredClone(marks))
    expect(h.past).toHaveLength(0)
  })

  it('沒有可以復原或重做的時候不動', () => {
    const h = startHistory(marks)
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })
})
