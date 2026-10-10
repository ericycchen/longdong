import { describe, expect, it } from 'vitest'
import { parseHash } from '../src/router'

describe('parseHash', () => {
  it('ID 可以含 "/"', () => {
    expect(parseHash('#/route/longdong/100.1')).toEqual({ name: 'route', id: 'longdong/100.1' })
    expect(parseHash('#/area/longdong/back-door')).toEqual({ name: 'area', id: 'longdong/back-door' })
  })

  it('舊網址轉成新 ID', () => {
    expect(parseHash('#/route/r523')).toEqual({ name: 'route', id: 'longdong/523' })
    expect(parseHash('#/route/r242-p2')).toEqual({ name: 'route', id: 'longdong/242-p2' })
    expect(parseHash('#/area/back-door')).toEqual({ name: 'area', id: 'longdong/back-door' })
  })

  it('其他頁面', () => {
    expect(parseHash('#/me')).toEqual({ name: 'me' })
    expect(parseHash('#/search?q=5.12')).toEqual({ name: 'search' })
    expect(parseHash('#/?q=5.12')).toEqual({ name: 'home' })
    expect(parseHash('')).toEqual({ name: 'home' })
  })
})
