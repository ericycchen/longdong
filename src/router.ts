import { useEffect, useState } from 'react'

/** 極簡 hash 路由：#/、#/area/<id>、#/route/<id>、#/me、#/about（id 本身含 "/"，例如 longdong/523） */
export type Page =
  | { name: 'home' }
  | { name: 'area'; id: string }
  | { name: 'route'; id: string }
  | { name: 'me' }
  | { name: 'about' }

const DEFAULT_CRAG = 'longdong'

/**
 * 舊網址相容：早期 ID 沒有岩場前綴（r523、r242-p2、back-door），
 * 轉成 longdong/523、longdong/242-p2、longdong/back-door。
 */
export function upgradeId(kind: 'area' | 'route', id: string): string {
  if (id.includes('/')) return id
  if (kind === 'route' && /^r\d/.test(id)) return `${DEFAULT_CRAG}/${id.slice(1)}`
  return `${DEFAULT_CRAG}/${id}`
}

export function parseHash(hash: string): Page {
  const path = decodeURIComponent(hash.replace(/^#/, '')).split('?')[0]
  const [, kind, ...rest] = path.split('/')
  const id = rest.join('/')
  if ((kind === 'area' || kind === 'route') && id) return { name: kind, id: upgradeId(kind, id) }
  if (kind === 'me') return { name: 'me' }
  if (kind === 'about') return { name: 'about' }
  return { name: 'home' }
}

// ID 只含 [a-z0-9./-]，不需要編碼
export const href = {
  home: () => '#/',
  area: (id: string) => `#/area/${id}`,
  route: (id: string) => `#/route/${id}`,
  me: () => '#/me',
  about: () => '#/about',
}

export function usePage(): Page {
  const [page, setPage] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => {
      setPage(parseHash(location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return page
}
