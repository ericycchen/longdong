import type { RouteStatus } from '../data/schema'
import { STATUS_INFO } from '../format'

export function StatusBadge({ status, compact = false }: { status: RouteStatus; compact?: boolean }) {
  const info = STATUS_INFO[status]
  return (
    <span className={`badge tone-${info.tone}${compact ? ' compact' : ''}`} title={info.label}>
      <span className="dot" aria-hidden />
      {info.label}
    </span>
  )
}
