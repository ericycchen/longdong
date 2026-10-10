import { useEffect, useState } from 'react'

/** 極簡 hash 路由：#/、#/area/:id、#/route/:id、#/about */
export type Page =
  | { name: 'home' }
  | { name: 'area'; id: string }
  | { name: 'route'; id: string }
  | { name: 'about' }

export function parseHash(hash: string): Page {
  const path = decodeURIComponent(hash.replace(/^#/, '')).split('?')[0]
  const [, kind, id] = path.split('/')
  if (kind === 'area' && id) return { name: 'area', id }
  if (kind === 'route' && id) return { name: 'route', id }
  if (kind === 'about') return { name: 'about' }
  return { name: 'home' }
}

export const href = {
  home: () => '#/',
  area: (id: string) => `#/area/${encodeURIComponent(id)}`,
  route: (id: string) => `#/route/${encodeURIComponent(id)}`,
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
