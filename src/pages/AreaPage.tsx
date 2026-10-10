import { useState } from 'react'
import type { LoadedData } from '../data/dataset'
import type { RouteType } from '../data/schema'
import { RouteRow } from '../components/RouteRow'
import { TYPE_LABEL } from '../format'
import { href } from '../router'

type Filter = RouteType | 'all'

export function AreaPage({ data, id }: { data: LoadedData; id: string }) {
  const area = data.areaById.get(id)
  const [filter, setFilter] = useState<Filter>('all')
  if (!area) return <NotFound />

  const all = area.sectors.flatMap((s) => s.routes)
  const types = (Object.keys(TYPE_LABEL) as RouteType[]).filter((t) => all.some((r) => r.type === t))

  return (
    <>
      <nav className="crumbs">
        <a href={href.home()}>龍洞</a>
      </nav>
      <h1>
        {area.name.zh} <span className="en">{area.name.en}</span>
      </h1>

      <div className="chips" role="group" aria-label="路線種類">
        {(['all', ...types] as Filter[]).map((t) => (
          <button key={t} className="chip" aria-pressed={filter === t} onClick={() => setFilter(t)}>
            {t === 'all' ? '全部' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {area.notes.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}

      {area.sectors.map((sector) => {
        const routes = sector.routes.filter((r) => filter === 'all' || r.type === filter)
        if (routes.length === 0) return null
        return (
          <section key={sector.id} className="sector">
            <h2>
              {sector.name.zh} {sector.name.en && <span className="en">{sector.name.en}</span>}
            </h2>
            <ul className="route-list">
              {routes.map((route) => (
                <RouteRow key={route.id} item={data.routeById.get(route.id)!} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

export function NotFound() {
  return (
    <div className="empty">
      <p>找不到這個頁面。</p>
      <a href={href.home()}>回首頁</a>
    </div>
  )
}
