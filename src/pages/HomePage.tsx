import type { LoadedData } from '../data/dataset'
import type { RouteType } from '../data/schema'
import { TYPE_LABEL } from '../format'
import { href } from '../router'

export function HomePage({ data }: { data: LoadedData }) {
  const { crag, areas } = data.dataset
  return (
    <>
      <h1>
        {crag.name.zh} <span className="en">{crag.name.en}</span>
      </h1>
      <ul className="area-grid">
        {areas.map((area) => {
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
    </>
  )
}
