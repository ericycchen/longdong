import type { Safety } from '../data/schema'

/** 畫面上只顯示燈號，文字用於螢幕報讀和關於頁的圖例 */
export const SAFETY_LABEL: Record<Safety, string> = {
  green: '正常',
  yellow: '小心',
  red: '危險',
}

const ORDER: Safety[] = ['red', 'yellow', 'green']

/** 跟 Sheet 一樣用三顆燈表示，亮起的那一顆就是評級；沒有評級時三顆都是灰的 */
export function SafetyLight({ safety }: { safety?: Safety }) {
  const label = safety ? `安全評級：${SAFETY_LABEL[safety]}` : '安全評級：尚未評級'
  return (
    <span className={`safety${safety ? '' : ' unrated'}`} role="img" aria-label={label} title={label}>
      {ORDER.map((s) => (
        <span key={s} className={`light light-${s}${s === safety ? ' on' : ''}`} />
      ))}
    </span>
  )
}
