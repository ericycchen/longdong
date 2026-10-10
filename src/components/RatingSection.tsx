import { useState } from 'react'
import { useCloud } from '../personal/sync'
import { rate } from '../social/actions'
import { FEELS, FEEL_LABEL, routeKey, summarize, type Feel } from '../social/model'
import { useSocial } from '../social/store'
import { SignInPrompt } from './SignInPrompt'
import { StarPicker } from './Stars'

export function RatingSection({ routeId }: { routeId: string }) {
  const social = useSocial()
  const cloud = useCloud()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const ratings = social.ratings[routeKey(routeId)]
  const summary = summarize(ratings)
  const uid = cloud.status === 'signed-in' ? cloud.user?.uid : undefined
  const mine = uid ? ratings?.[uid] : undefined

  const save = async (stars: number, feel: Feel | undefined) => {
    setBusy(true)
    setError(undefined)
    try {
      await rate(routeId, { stars, ...(feel ? { feel } : {}) })
    } catch (err) {
      setError(`無法儲存評分（${(err as Error).message}）`)
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await rate(routeId, null)
    } catch (err) {
      setError(`無法刪除評分（${(err as Error).message}）`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rating">
      <h2>評分</h2>
      {summary ? (
        <div className="rating-summary">
          <div className="rating-average">
            <strong>{summary.average.toFixed(1)}</strong>
            <span className="stars-static" aria-hidden>
              {'★★★★★'.slice(0, Math.round(summary.average))}
              <span className="dim">{'★★★★★'.slice(Math.round(summary.average))}</span>
            </span>
            <span className="muted small">{summary.count} 人評分</span>
          </div>
          <ul className="rating-bars" aria-label="各星等人數">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n}>
                <span>{n}</span>
                <span className="bar">
                  <span style={{ width: `${(summary.stars[n - 1] / summary.count) * 100}%` }} />
                </span>
                <span className="muted">{summary.stars[n - 1]}</span>
              </li>
            ))}
          </ul>
          {summary.feel.soft + summary.feel.fair + summary.feel.hard > 0 && (
            <p className="small">
              體感難度：
              {FEELS.map((f) => `${f.label} ${summary.feel[f.value]}`).join(' · ')}
            </p>
          )}
        </div>
      ) : (
        <p className="muted small">{social.ratingsLoaded ? '還沒有人評分。' : '載入中…'}</p>
      )}

      {cloud.status === 'signed-in' ? (
        <div className="my-rating">
          <p className="small">{mine ? '你的評分（點選可修改）' : '你覺得這條路線如何？'}</p>
          <StarPicker value={mine?.stars ?? 0} disabled={busy} onChange={(stars) => void save(stars, mine?.feel)} />
          <div className="chips" role="group" aria-label="體感難度">
            {FEELS.map((f) => (
              <button
                key={f.value}
                className="chip"
                aria-pressed={mine?.feel === f.value}
                disabled={busy || !mine}
                title={mine ? undefined : '先選星等'}
                onClick={() => mine && void save(mine.stars, mine.feel === f.value ? undefined : f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {mine && (
            <button className="link-button" onClick={() => void clear()} disabled={busy}>
              刪除我的評分
            </button>
          )}
          {mine?.feel && <p className="muted small">你覺得難度{FEEL_LABEL[mine.feel]}</p>}
          {error && <p className="small error">{error}</p>}
        </div>
      ) : (
        cloud.status !== 'loading' && <SignInPrompt message="登入後可以替路線評分。" />
      )}
    </section>
  )
}
