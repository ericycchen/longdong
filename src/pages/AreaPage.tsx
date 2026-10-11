import { useState } from 'react'
import type { LoadedData } from '../data/dataset'
import type { Route, RouteType, Sector } from '../data/schema'
import { RouteRow } from '../components/RouteRow'
import { TYPE_LABEL } from '../format'
import { href } from '../router'

/** 區域頁：列出分區，點進去才看路線（只有一個分區時直接顯示路線） */
export function AreaPage({ data, id }: { data: LoadedData; id: string }) {
  const area = data.areaById.get(id)
  if (!area) return <NotFound />
  const routeCount = area.sectors.reduce((n, s) => n + s.routes.filter((r) => !r.isFixture).length, 0)

  return (
    <>
      <h1>
        {area.name.zh} <span className="en">{area.name.en}</span>
      </h1>
      <p className="muted small page-sub">
        {area.sectors.length > 1 ? `${area.sectors.length} 個分區・` : ''}
        {routeCount} 條路線
      </p>

      {area.notes.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}

      {area.sectors.length === 1 ? (
        <SectorRoutes data={data} sector={area.sectors[0]} />
      ) : (
        <ul className="sector-grid">
          {area.sectors.map((sector) => (
            <li key={sector.id}>
              <SectorCard sector={sector} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function SectorCard({ sector }: { sector: Sector }) {
  const routes = sector.routes.filter((r) => !r.isFixture)
  const range = gradeRange(routes)
  return (
    <a className="sector-card" href={href.sector(sector.id)}>
      <span className="sector-name">
        {sector.name.zh}
        {sector.name.en && <span className="en">{sector.name.en}</span>}
      </span>
      <span className="sector-stats">
        <strong>{routes.length}</strong> 條{range && <span className="muted">・{range}</span>}
      </span>
      <span className="area-types">{typeSummary(routes)}</span>
      <span className="chevron" aria-hidden>
        ›
      </span>
    </a>
  )
}

/** 分區頁：路線清單，可依種類篩選 */
export function SectorPage({ data, id }: { data: LoadedData; id: string }) {
  const found = data.sectorById.get(id)
  if (!found) return <NotFound />
  const { sector, area } = found
  return (
    <>
      <nav className="crumbs">
        <a href={href.area(area.id)}>{area.name.zh}</a>
      </nav>
      <h1>
        {sector.name.zh} <span className="en">{sector.name.en}</span>
      </h1>
      <SectorRoutes data={data} sector={sector} />
    </>
  )
}

type Filter = RouteType | 'all'

function SectorRoutes({ data, sector }: { data: LoadedData; sector: Sector }) {
  const [filter, setFilter] = useState<Filter>('all')
  const types = (Object.keys(TYPE_LABEL) as RouteType[]).filter((t) => sector.routes.some((r) => r.type === t))
  const routes = sector.routes.filter((r) => filter === 'all' || r.type === filter)
  return (
    <>
      {types.length > 1 && (
        <div className="chips" role="group" aria-label="路線種類">
          {(['all', ...types] as Filter[]).map((t) => (
            <button key={t} className="chip" aria-pressed={filter === t} onClick={() => setFilter(t)}>
              {t === 'all' ? '全部' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}
      <ul className="route-list">
        {routes.map((route) => (
          <RouteRow key={route.id} item={data.routeById.get(route.id)!} />
        ))}
      </ul>
    </>
  )
}

export function typeSummary(routes: Route[]): string {
  const byType = new Map<RouteType, number>()
  for (const r of routes) if (r.type) byType.set(r.type, (byType.get(r.type) ?? 0) + 1)
  return [...byType]
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${TYPE_LABEL[t]} ${n}`)
    .join(' · ')
}

/** 「5.7–5.12a」；只有一種難度時只顯示一個 */
function gradeRange(routes: Route[]): string | undefined {
  const graded = routes.filter((r) => r.grade && r.gradeValue !== undefined)
  if (graded.length === 0) return undefined
  const sorted = [...graded].sort((a, b) => a.gradeValue! - b.gradeValue!)
  const lo = sorted[0].grade!.replace(/\s.*$/, '')
  const hi = sorted[sorted.length - 1].grade!.replace(/\s.*$/, '')
  return lo === hi ? lo : `${lo}–${hi}`
}

export function NotFound() {
  return (
    <div className="empty">
      <p>找不到這個頁面。</p>
      <a href={href.home()}>回首頁</a>
    </div>
  )
}
