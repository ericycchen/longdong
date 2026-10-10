import type { RouteRef } from '../data/dataset'
import { TYPE_LABEL } from '../format'
import { href } from '../router'
import { SafetyLight } from './SafetyLight'
import { StatusBadge } from './StatusBadge'

export function RouteRow({ item, showPlace = false }: { item: RouteRef; showPlace?: boolean }) {
  const { route, sector, area } = item
  return (
    <li>
      <a className="route-row" href={href.route(route.id)}>
        <span className="route-no">{route.number ? `#${route.number}` : '—'}</span>
        <span className="route-name">
          <span className="zh">{route.name.zh}</span>
          {route.name.en && <span className="en">{route.name.en}</span>}
          {showPlace && (
            <span className="place">
              {area.name.zh} · {sector.name.zh}
            </span>
          )}
        </span>
        <span className="route-meta">
          <span className="grade-line">
            {!route.isFixture && <SafetyLight safety={route.safety} />}
            {route.grade && <span className="grade">{route.grade}</span>}
          </span>
          <span className="type">{route.isFixture ? '固定點' : route.type ? TYPE_LABEL[route.type] : ''}</span>
          {route.status && <StatusBadge status={route.status} compact />}
        </span>
      </a>
    </li>
  )
}
