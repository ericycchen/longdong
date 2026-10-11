import type { RouteStatus } from '../data/schema'
import { STATUS_TONE } from '../format'
import { useLang } from '../i18n'

export function StatusBadge({ status, compact = false }: { status: RouteStatus; compact?: boolean }) {
  const { t } = useLang()
  const label = t(`status.${status}`)
  return (
    <span className={`badge tone-${STATUS_TONE[status]}${compact ? ' compact' : ''}`} title={label}>
      <span className="dot" aria-hidden />
      {label}
    </span>
  )
}
