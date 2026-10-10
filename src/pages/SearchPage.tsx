import { useEffect, useMemo, useRef, useState } from 'react'
import type { LoadedData } from '../data/dataset'
import { RouteRow } from '../components/RouteRow'
import { href } from '../router'
import { buildIndex, search } from '../search'

const MAX_RESULTS = 100
const EXAMPLES = ['5.10a', '黃金谷', 'Olive Branch', '523']

function readQuery(): string {
  const m = location.hash.match(/[?&]q=([^&]*)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export function SearchPage({ data }: { data: LoadedData }) {
  const [query, setQuery] = useState(readQuery)
  const input = useRef<HTMLInputElement>(null)
  const index = useMemo(() => buildIndex(data.routes), [data])
  const results = useMemo(() => {
    const found = search(index, query).map((id) => data.routeById.get(id)!)
    // 查難度（例如 5.12）時，依難度排序比依相關度直覺
    if (/^5\.\d/.test(query.trim())) found.sort((a, b) => (a.route.gradeValue ?? 99) - (b.route.gradeValue ?? 99))
    return found
  }, [index, query, data])

  useEffect(() => {
    if (!query) input.current?.focus()
  }, [query])

  const onChange = (q: string) => {
    setQuery(q)
    // 搜尋字串放進網址，從路線頁按返回時結果還在
    history.replaceState(null, '', href.search(q))
  }

  return (
    <>
      <div className="search">
        <input
          ref={input}
          type="search"
          inputMode="search"
          placeholder="路線名稱、編號、難度、首攀者…"
          aria-label="搜尋路線"
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {query.trim() ? (
        <section>
          <p className="muted small">
            {results.length === 0
              ? '找不到符合的路線'
              : `${results.length} 條結果${results.length > MAX_RESULTS ? `，顯示前 ${MAX_RESULTS} 條` : ''}`}
          </p>
          <ul className="route-list">
            {results.slice(0, MAX_RESULTS).map((item) => (
              <RouteRow key={item.route.id} item={item} showPlace />
            ))}
          </ul>
        </section>
      ) : (
        <div className="search-hints">
          <p className="muted small">試試看：</p>
          <div className="chips">
            {EXAMPLES.map((q) => (
              <button key={q} className="chip" onClick={() => onChange(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
