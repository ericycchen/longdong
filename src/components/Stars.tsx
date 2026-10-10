import type { RatingSummary } from '../social/model'

/** 清單用的小型評分：★4.3 (12) */
export function StarsBadge({ summary }: { summary?: RatingSummary }) {
  if (!summary) return null
  return (
    <span className="stars-badge" aria-label={`平均 ${summary.average.toFixed(1)} 星，${summary.count} 人評分`}>
      ★{summary.average.toFixed(1)}
      <span className="muted"> ({summary.count})</span>
    </span>
  )
}

/** 可點選的 1–5 星；value 為 0 表示未評分 */
export function StarPicker({ value, onChange, disabled }: { value: number; onChange: (stars: number) => void; disabled?: boolean }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="評分">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} 星`}
          className={n <= value ? 'on' : ''}
          disabled={disabled}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
