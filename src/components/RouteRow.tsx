import type { RouteRef } from '../data/dataset'
import { typeText } from '../format'
import { isSent } from '../personal/model'
import { usePersonal } from '../personal/store'
import { href } from '../router'
import { SafetyLight } from './SafetyLight'
import { StatusBadge } from './StatusBadge'

export function RouteRow({ item, showPlace = false }: { item: RouteRef; showPlace?: boolean }) {
  const { route, sector, area } = item
  const personal = usePersonal()
  const favorite = personal.favorites.has(route.id)
  const sent = personal.ticks.some((t) => t.routeId === route.id && isSent(t.style))
  return (
    <li>
      <a className="route-row" href={href.route(route.id)}>
        <span className="route-no">{route.number ? `#${route.number}` : '—'}</span>
        <span className="route-name">
          <span className="zh">
            {route.name.zh}
            {(favorite || sent) && (
              <span className="marks">
                {sent && <span title="已完攀" aria-label="已完攀">✓</span>}
                {favorite && <span title="已收藏" aria-label="已收藏">★</span>}
              </span>
            )}
          </span>
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
          <span className="type">{typeText(route)}</span>
          {route.status && <StatusBadge status={route.status} compact />}
        </span>
      </a>
    </li>
  )
}
