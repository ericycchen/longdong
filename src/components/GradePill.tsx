import { gradeBand } from '../format'

/** 難度標籤：依難度區間上淡色底，文字維持一般字色 */
export function GradePill({ grade, value, size = 'md' }: { grade?: string; value?: number; size?: 'sm' | 'md' | 'lg' }) {
  if (!grade) return null
  const band = gradeBand(value)
  return <span className={`grade-pill size-${size}${band ? ` band-${band}` : ''}`}>{grade}</span>
}
