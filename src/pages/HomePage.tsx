import type { LoadedData } from '../data/dataset'
import { GradeDistribution } from '../components/Charts'
import { gradeDistribution } from '../format'
import { href } from '../router'
import { typeSummary } from './AreaPage'

/** 首頁：龍洞的各區域，一區一列；左框用 Sheet 上該區域的顏色 */
export function HomePage({ data }: { data: LoadedData }) {
  return (
    <ul className="area-list">
      {data.dataset.areas.map((area) => {
        const routes = area.sectors.flatMap((s) => s.routes).filter((r) => !r.isFixture)
        return (
          <li key={area.id}>
            <a className="area-row" href={href.area(area.id)} style={{ '--area-color': area.color } as React.CSSProperties}>
              <span className="area-info">
                <span className="area-name">{area.name.zh}</span>
                <span className="en">{area.name.en}</span>
                <span className="area-count">
                  {routes.length} 條路線
                  {area.sectors.length > 1 && <span className="muted nowrap">・{area.sectors.length} 個分區</span>}
                </span>
                <span className="area-types">{typeSummary(routes)}</span>
              </span>
              <GradeDistribution bands={gradeDistribution(routes)} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
