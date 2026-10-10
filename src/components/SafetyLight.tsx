import type { Safety } from '../data/schema'

export const SAFETY_LABEL: Record<Safety, string> = {
  red: '紅燈',
  yellow: '黃燈',
  green: '綠燈',
}

const ORDER: Safety[] = ['red', 'yellow', 'green']

/** 跟 Sheet 一樣用三顆燈表示，亮起的那一顆就是評級；沒有評級時三顆都是灰的 */
export function SafetyLight({ safety, showLabel = false }: { safety?: Safety; showLabel?: boolean }) {
  const label = safety ? `安全評級：${SAFETY_LABEL[safety]}` : '安全評級：尚未評級'
  return (
    <span className={`safety${safety ? '' : ' unrated'}`} role="img" aria-label={label} title={label}>
      {ORDER.map((s) => (
        <span key={s} className={`light light-${s}${s === safety ? ' on' : ''}`} />
      ))}
      {showLabel && <span className="safety-label">{safety ? SAFETY_LABEL[safety] : '尚未評級'}</span>}
    </span>
  )
}
