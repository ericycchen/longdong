import { useState } from 'react'
import type { Route } from '../data/schema'
import { formatDate } from '../format'
import { useLang } from '../i18n'
import { TICK_STYLES, today, type TickStyle } from '../personal/model'
import { addTick, deleteTick, setFavorite, usePersonal } from '../personal/store'

/** 路線頁上的收藏按鈕與個人攀登紀錄 */
export function PersonalPanel({ route }: { route: Route }) {
  const personal = usePersonal()
  const { t } = useLang()
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
          {favorite ? t('fav.on') : t('fav.off')}
        </button>
        <button className="action" onClick={() => setOpen(true)} disabled={!personal.ready || open}>
          {t('tick.add')}
        </button>
      </div>

      {open && <TickForm routeId={route.id} onDone={() => setOpen(false)} />}

      {ticks.length > 0 && (
        <ul className="my-ticks">
          {ticks.map((tick) => (
            <li key={tick.id}>
              <span className="tick-date">{formatDate(tick.date)}</span>
              <span className={`tick-style style-${tick.style}`}>{t(`style.${tick.style}`)}</span>
              {tick.note && <span className="tick-note">{tick.note}</span>}
              <button
                className="link-button"
                aria-label={t('tick.deleteAria')}
                onClick={() => confirm(t('tick.confirmDelete')) && deleteTick(tick.id)}
              >
                {t('tick.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TickForm({ routeId, onDone }: { routeId: string; onDone: () => void }) {
  const { t } = useLang()
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
        {t('tick.date')}
        <input type="date" value={date} max={today()} required onChange={(e) => setDate(e.target.value)} />
      </label>
      <fieldset>
        <legend>{t('tick.style')}</legend>
        <div className="chips">
          {TICK_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              className="chip"
              aria-pressed={style === s.value}
              onClick={() => setStyle(s.value)}
            >
              {t(`style.${s.value}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        {t('tick.note')}
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="actions">
        <button type="submit" className="action primary" disabled={saving || !date}>
          {t('action.save')}
        </button>
        <button type="button" className="action" onClick={onDone}>
          {t('action.cancel')}
        </button>
      </div>
    </form>
  )
}
