import { describe, expect, it } from 'vitest'
import { feelConsensus, routeKey, summarize, type Rating } from '../src/social/model'

const r = (stars: number, feel?: Rating['feel']): Rating => ({ stars, feel, updatedAt: 'x' })

describe('summarize', () => {
  it('平均、各星等人數、體感統計', () => {
    const s = summarize({ a: r(5, 'hard'), b: r(4, 'hard'), c: r(3, 'fair'), d: r(4) })!
    expect(s.count).toBe(4)
    expect(s.average).toBe(4)
    expect(s.stars).toEqual([0, 0, 1, 2, 1])
    expect(s.feel).toEqual({ soft: 0, fair: 1, hard: 2 })
  })

  it('沒有評分時回傳 undefined，忽略不合法的星等', () => {
    expect(summarize(undefined)).toBeUndefined()
    expect(summarize({ a: r(0), b: r(6) })).toBeUndefined()
  })
})

describe('feelConsensus', () => {
  it('至少 3 人回答且過半才顯示', () => {
    expect(feelConsensus(summarize({ a: r(4, 'hard'), b: r(4, 'hard') }))).toBeUndefined()
    expect(feelConsensus(summarize({ a: r(4, 'hard'), b: r(4, 'hard'), c: r(4, 'soft') }))).toBe('hard')
    expect(feelConsensus(summarize({ a: r(4, 'hard'), b: r(4, 'soft'), c: r(4, 'fair') }))).toBeUndefined()
  })
})

describe('routeKey', () => {
  it('轉成 Realtime Database 可用的 key', () => {
    expect(routeKey('longdong/328ac2')).toBe('longdong:328ac2')
    expect(routeKey('longdong/100.1')).toBe('longdong:100,1')
  })
})
