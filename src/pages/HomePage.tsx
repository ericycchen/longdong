import type { LoadedData } from '../data/dataset'
import { href } from '../router'
import { typeSummary } from './AreaPage'

/** 首頁：龍洞的各區域（只有一個岩場，不另外顯示岩場名稱） */
export function HomePage({ data }: { data: LoadedData }) {
  return (
    <ul className="area-grid home">
      {data.dataset.areas.map((area) => {
        const routes = area.sectors.flatMap((s) => s.routes).filter((r) => !r.isFixture)
        return (
          <li key={area.id}>
            <a className="area-card" href={href.area(area.id)}>
              <span className="area-name">{area.name.zh}</span>
              <span className="en">{area.name.en}</span>
              <span className="area-count">
                {routes.length} 條路線{area.sectors.length > 1 && <span className="muted">・{area.sectors.length} 個分區</span>}
              </span>
              <span className="area-types">{typeSummary(routes)}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
