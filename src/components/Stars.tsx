import { useLang } from '../i18n'
import type { RatingSummary } from '../social/model'

/** 清單用的小型評分：★4.3 (12) */
export function StarsBadge({ summary }: { summary?: RatingSummary }) {
  const { t } = useLang()
  if (!summary) return null
  return (
    <span className="stars-badge" aria-label={t('rating.badgeAria', { avg: summary.average.toFixed(1), n: summary.count })}>
      ★{summary.average.toFixed(1)}
      <span className="muted"> ({summary.count})</span>
    </span>
  )
}

/** 可點選的 1–5 星；value 為 0 表示未評分 */
export function StarPicker({ value, onChange, disabled }: { value: number; onChange: (stars: number) => void; disabled?: boolean }) {
  const { t } = useLang()
  return (
    <div className="star-picker" role="radiogroup" aria-label={t('rating.aria')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t('rating.stars', { n })}
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
