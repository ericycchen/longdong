import type { CSSProperties } from 'react'
import { localName, useLang, type Lang } from '../i18n'
import type { Dir, Neighbor, Neighbors } from '../swipe'

/** 上一個／下一個的名稱；路線加上編號 */
export function neighborLabel(n: Neighbor, lang: Lang): string {
  return `${n.number ? `#${n.number} ` : ''}${localName(n.name, lang).main}`
}

/** 上一個／下一個的卡片用那一區的顏色（路線是所在分區的顏色） */
export const neighborStyle = (n: Neighbor) => (n.color ? ({ '--area-color': n.color } as CSSProperties) : undefined)

/** 手機版區域、分區、路線頁底部的上一個／下一個（用那一區的顏色）；跨到另一個分區的路線標出分區名稱 */
export function Pager({ near, onGo }: { near: Neighbors; onGo: (dir: Dir) => void }) {
  const { lang, t } = useLang()
  const route = near.kind === 'route'
  const label = (n: Neighbor) => neighborLabel(n, lang)
  const caption = (dir: 'prev' | 'next', n: Neighbor) => {
    const text = t(route ? (dir === 'prev' ? 'swipe.prevRoute' : 'swipe.nextRoute') : dir === 'prev' ? 'swipe.prev' : 'swipe.next')
    const where = n.sector ? ` · ${localName(n.sector, lang).main}` : ''
    return dir === 'prev' ? `‹ ${text}${where}` : `${text}${where} ›`
  }
  return (
    <nav className="pager" aria-label={t(route ? 'swipe.ariaRoute' : 'swipe.aria')}>
      {near.prev ? (
        <a href={near.prev.hash} className={near.prev.color ? 'colored' : undefined} style={neighborStyle(near.prev)} onClick={() => onGo('prev')}>
          <span className="pager-name muted small">{caption('prev', near.prev)}</span>
          <span className="pager-name">{label(near.prev)}</span>
        </a>
      ) : (
        <span />
      )}
      {near.next ? (
        <a href={near.next.hash} className={near.next.color ? 'next colored' : 'next'} style={neighborStyle(near.next)} onClick={() => onGo('next')}>
          <span className="pager-name muted small">{caption('next', near.next)}</span>
          <span className="pager-name">{label(near.next)}</span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}
