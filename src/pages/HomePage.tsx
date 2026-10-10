import { useMemo, useState } from 'react'
import type { LoadedData } from '../data/dataset'
import type { RouteType } from '../data/schema'
import { RouteRow } from '../components/RouteRow'
import { TYPE_LABEL } from '../format'
import { href } from '../router'
import { buildIndex, search } from '../search'
import { usePersonal } from '../personal/store'

const MAX_RESULTS = 100

function readQuery(): string {
  const m = location.hash.match(/[?&]q=([^&]*)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export function HomePage({ data }: { data: LoadedData }) {
  const [query, setQuery] = useState(readQuery)
  const personal = usePersonal()
  const index = useMemo(() => buildIndex(data.routes), [data])
  const results = useMemo(() => {
    const found = search(index, query).map((id) => data.routeById.get(id)!)
    // 查難度（例如 5.12）時，依難度排序比依相關度直覺
    if (/^5\.\d/.test(query.trim()))
      found.sort((a, b) => (a.route.gradeValue ?? 99) - (b.route.gradeValue ?? 99))
    return found
  }, [index, query, data])

  const onChange = (q: string) => {
    setQuery(q)
    // 搜尋字串放進網址，從路線頁按返回時結果還在
    history.replaceState(null, '', q ? `#/?q=${encodeURIComponent(q)}` : '#/')
  }

  return (
    <>
      <div className="search">
        <input
          type="search"
          inputMode="search"
          placeholder="搜尋路線名稱、編號、難度、首攀者…"
          aria-label="搜尋路線"
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {!query.trim() && !personal.error && (
        <a className="me-link" href={href.me()}>
          <span>我的紀錄</span>
          <span className="muted small">
            ★ 收藏 {personal.favorites.size} · ✓ 攀登紀錄 {personal.ticks.length}
          </span>
        </a>
      )}

      {query.trim() ? (
        <section>
          <p className="muted small">
            {results.length === 0 ? '找不到符合的路線' : `${results.length} 條結果${results.length > MAX_RESULTS ? `，顯示前 ${MAX_RESULTS} 條` : ''}`}
          </p>
          <ul className="route-list">
            {results.slice(0, MAX_RESULTS).map((item) => (
              <RouteRow key={item.route.id} item={item} showPlace />
            ))}
          </ul>
        </section>
      ) : (
        <ul className="area-grid">
          {data.dataset.areas.map((area) => {
            const routes = area.sectors.flatMap((s) => s.routes).filter((r) => !r.isFixture)
            const byType = new Map<RouteType, number>()
            for (const r of routes) if (r.type) byType.set(r.type, (byType.get(r.type) ?? 0) + 1)
            return (
              <li key={area.id}>
                <a className="area-card" href={href.area(area.id)}>
                  <span className="area-name">{area.name.zh}</span>
                  <span className="en">{area.name.en}</span>
                  <span className="area-count">{routes.length} 條路線</span>
                  <span className="area-types">
                    {[...byType]
                      .sort((a, b) => b[1] - a[1])
                      .map(([t, n]) => `${TYPE_LABEL[t]} ${n}`)
                      .join(' · ')}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
