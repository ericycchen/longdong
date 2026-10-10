import { useState } from 'react'
import type { Route } from '../data/schema'
import { formatDate } from '../format'
import { TICK_STYLES, TICK_STYLE_LABEL, today, type TickStyle } from '../personal/model'
import { addTick, deleteTick, setFavorite, usePersonal } from '../personal/store'

/** 路線頁上的收藏按鈕與個人攀登紀錄 */
export function PersonalPanel({ route }: { route: Route }) {
  const personal = usePersonal()
  const [open, setOpen] = useState(false)
  const favorite = personal.favorites.has(route.id)
  const ticks = personal.ticks.filter((t) => t.routeId === route.id)

  if (personal.error) return null

  return (
    <section className="personal">
      <div className="actions">
        <button
          className={`action${favorite ? ' on' : ''}`}
          aria-pressed={favorite}
          onClick={() => setFavorite(route.id, !favorite)}
          disabled={!personal.ready}
        >
          {favorite ? '★ 已收藏' : '☆ 收藏'}
        </button>
        <button className="action" onClick={() => setOpen(true)} disabled={!personal.ready || open}>
          ＋ 記錄攀登
        </button>
      </div>

      {open && <TickForm routeId={route.id} onDone={() => setOpen(false)} />}

      {ticks.length > 0 && (
        <ul className="my-ticks">
          {ticks.map((t) => (
            <li key={t.id}>
              <span className="tick-date">{formatDate(t.date)}</span>
              <span className={`tick-style style-${t.style}`}>{TICK_STYLE_LABEL[t.style]}</span>
              {t.note && <span className="tick-note">{t.note}</span>}
              <button
                className="link-button"
                aria-label="刪除這筆紀錄"
                onClick={() => confirm('刪除這筆攀登紀錄？') && deleteTick(t.id)}
              >
                刪除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TickForm({ routeId, onDone }: { routeId: string; onDone: () => void }) {
  const [date, setDate] = useState(today)
  const [style, setStyle] = useState<TickStyle>('redpoint')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await addTick({ routeId, date, style, note: note.trim() || undefined })
    onDone()
  }

  return (
    <form
      className="tick-form"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <label>
        日期
        <input type="date" value={date} max={today()} required onChange={(e) => setDate(e.target.value)} />
      </label>
      <fieldset>
        <legend>方式</legend>
        <div className="chips">
          {TICK_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              className="chip"
              aria-pressed={style === s.value}
              onClick={() => setStyle(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        心得（選填）
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="actions">
        <button type="submit" className="action primary" disabled={saving || !date}>
          儲存
        </button>
        <button type="button" className="action" onClick={onDone}>
          取消
        </button>
      </div>
    </form>
  )
}
