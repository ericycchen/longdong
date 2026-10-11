import type { Safety } from '../data/schema'
import { useLang } from '../i18n'

const ORDER: Safety[] = ['red', 'yellow', 'green']

/** 跟 Sheet 一樣用三顆燈表示，亮起的那一顆就是評級；沒有評級時三顆都是灰的。文字只用於螢幕報讀與提示 */
export function SafetyLight({ safety }: { safety?: Safety }) {
  const { t } = useLang()
  const label = t('safety.aria', { label: safety ? t(`safety.${safety}`) : t('safety.unrated') })
  return (
    <span className={`safety${safety ? '' : ' unrated'}`} role="img" aria-label={label} title={label}>
      {ORDER.map((s) => (
        <span key={s} className={`light light-${s}${s === safety ? ' on' : ''}`} />
      ))}
    </span>
  )
}
