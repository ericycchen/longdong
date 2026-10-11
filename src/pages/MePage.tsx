import { useState } from 'react'
import type { LoadedData } from '../data/dataset'
import { GradePyramid, MonthlyChart } from '../components/Charts'
import { GradePill } from '../components/GradePill'
import { RouteRow } from '../components/RouteRow'
import { FACEBOOK_LOGIN_ENABLED, SignInPrompt } from '../components/SignInPrompt'
import { relativeTime } from '../format'
import { TICK_STYLE_LABEL, isSent } from '../personal/model'
import { gradePyramid, groupByMonth, monthlyCounts } from '../personal/stats'
import { deleteTick, setFavorite, usePersonal } from '../personal/store'
import { signOut, useCloud } from '../personal/sync'
import { deleteMyAccount, rename } from '../social/actions'
import { NAME_MAX } from '../social/model'
import { displayName, useSocial } from '../social/store'
import { href } from '../router'

type Tab = 'ticks' | 'favorites'

export function MePage({ data }: { data: LoadedData }) {
  const cloud = useCloud()

  if (cloud.status === 'signed-in' && cloud.user) {
    return <SignedIn data={data} uid={cloud.user.uid} email={cloud.user.email} />
  }
  if (cloud.status === 'loading') return <p className="empty muted">載入中…</p>

  return (
    <>
      <h1>我的</h1>
      <section className="card intro-card">
        <h2>記錄你的龍洞攀登</h2>
        <ul className="feature-list">
          <li>
            <strong>攀登紀錄</strong>
            <span>日期、Onsight／Flash／Redpoint、心得，自動統計難度金字塔</span>
          </li>
          <li>
            <strong>收藏</strong>
            <span>把想爬的路線存起來</span>
          </li>
          <li>
            <strong>評分與留言</strong>
            <span>分享 beta、現場狀況、岩質或 bolt 問題</span>
          </li>
          <li>
            <strong>跨裝置同步</strong>
            <span>手機和電腦自動同步，沒網路也能記錄</span>
          </li>
        </ul>
        <SignInPrompt message={`用 Google${FACEBOOK_LOGIN_ENABLED ? ' 或 Facebook' : ''} 帳號登入，Email 不會公開。`} />
      </section>
      <p className="center small">
        <a href={href.about()}>關於與說明</a>
      </p>
    </>
  )
}

function SignedIn({ data, uid, email }: { data: LoadedData; uid: string; email: string }) {
  const personal = usePersonal()
  const cloud = useCloud()
  const social = useSocial()
  const [tab, setTab] = useState<Tab>('ticks')
  const [settings, setSettings] = useState(false)

  const lookup = (id: string) => data.routeById.get(id)
  const name = displayName(social.profiles, uid)
  const sentRoutes = new Set(personal.ticks.filter((t) => isSent(t.style)).map((t) => t.routeId))
  const pyramid = gradePyramid(personal.ticks, (id) => lookup(id)?.route)
  const hardest = pyramid[0]

  return (
    <>
      <header className="profile-head">
        <span className="avatar" aria-hidden>
          {[...name][0]}
        </span>
        <div className="profile-text">
          <h1>{name}</h1>
          <p className="muted small">
            {cloud.syncing
              ? '同步中…'
              : !cloud.connected
                ? '離線中・恢復連線後自動同步'
                : cloud.lastSync
                  ? `已同步・${relativeTime(cloud.lastSync)}`
                  : '已連線'}
          </p>
        </div>
        <button
          className={`icon-button${settings ? ' on' : ''}`}
          aria-label="帳號設定"
          aria-expanded={settings}
          onClick={() => setSettings((s) => !s)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
              transform="translate(-1 0)"
            />
          </svg>
        </button>
      </header>
      {cloud.error && <p className="small error">{cloud.error}</p>}

      {settings && <Settings uid={uid} email={email} />}

      <section className="stat-row">
        <div>
          <strong>{sentRoutes.size}</strong>
          <span>完攀路線</span>
        </div>
        <div>
          <strong>{personal.ticks.length}</strong>
          <span>攀登紀錄</span>
        </div>
        <div>
          <strong>{hardest?.grade ?? '—'}</strong>
          <span>最難完攀</span>
        </div>
      </section>

      <section className="card">
        <h2>難度金字塔</h2>
        <GradePyramid rows={pyramid} />
      </section>

      <section className="card">
        <h2>近 12 個月</h2>
        <MonthlyChart months={monthlyCounts(personal.ticks)} />
      </section>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'ticks'} onClick={() => setTab('ticks')}>
          攀登紀錄
        </button>
        <button role="tab" aria-selected={tab === 'favorites'} onClick={() => setTab('favorites')}>
          收藏{personal.favorites.size > 0 && ` ${personal.favorites.size}`}
        </button>
      </div>

      {tab === 'ticks' &&
        (personal.ticks.length === 0 ? (
          <p className="empty muted">還沒有攀登紀錄。在路線頁按「記錄攀登」就會出現在這裡。</p>
        ) : (
          groupByMonth(personal.ticks).map((g) => (
            <section key={g.key} className="timeline">
              <h3>{g.label}</h3>
              <ul className="list-card">
                {g.ticks.map((t) => {
                  const r = lookup(t.routeId)?.route
                  return (
                    <li key={t.id} className="timeline-item">
                      <span className="timeline-day">
                        <strong>{Number(t.date.slice(8, 10))}</strong>
                        <span>日</span>
                      </span>
                      <a className="timeline-body" href={href.route(t.routeId)}>
                        <span className="timeline-title">
                          {r ? `${r.number ? `#${r.number} ` : ''}${r.name.zh}` : `找不到路線（${t.routeId}）`}
                        </span>
                        <span className="timeline-meta">
                          <span className={`style-tag style-${t.style}`}>{TICK_STYLE_LABEL[t.style]}</span>
                          {t.note && <span className="muted">{t.note}</span>}
                        </span>
                      </a>
                      <GradePill grade={r?.grade} value={r?.gradeValue} size="sm" />
                      <button
                        className="icon-button small"
                        aria-label="刪除這筆紀錄"
                        onClick={() => confirm('刪除這筆攀登紀錄？') && deleteTick(t.id)}
                      >
                        ×
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        ))}

      {tab === 'favorites' &&
        (personal.favorites.size === 0 ? (
          <p className="empty muted">還沒有收藏。在路線頁按「收藏」就會出現在這裡。</p>
        ) : (
          <ul className="list-card">
            {[...personal.favorites].map((id) => {
              const ref = lookup(id)
              return ref ? (
                <RouteRow key={id} item={ref} showPlace />
              ) : (
                <li key={id} className="timeline-item">
                  <span className="timeline-body muted small">找不到路線（{id}）</span>
                  <button className="icon-button small" aria-label="移除收藏" onClick={() => setFavorite(id, false)}>
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
    </>
  )
}

function Settings({ uid, email }: { uid: string; email: string }) {
  return (
    <section className="card settings">
      <NameEditor uid={uid} />
      <p className="muted small">{email}（不公開）</p>
      <div className="settings-links">
        <a href={href.about()}>關於與說明</a>
        <button
          className="link-button"
          onClick={() => confirm('登出？這台裝置上的紀錄會清除，下次登入會從雲端載入。') && void signOut()}
        >
          登出
        </button>
      </div>
      <DeleteAccount />
    </section>
  )
}

function NameEditor({ uid }: { uid: string }) {
  const social = useSocial()
  const [value, setValue] = useState(() => displayName(social.profiles, uid))
  const [state, setState] = useState<{ busy?: boolean; error?: string; saved?: boolean }>({})
  return (
    <form
      className="name-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setState({ busy: true })
        try {
          await rename(value)
          setState({ saved: true })
        } catch (err) {
          setState({ error: (err as Error).message })
        }
      }}
    >
      <label>
        <span>
          暱稱 <span className="muted small">留言和評分會顯示</span>
        </span>
        <span className="name-row">
          <input value={value} maxLength={NAME_MAX} onChange={(e) => setValue(e.target.value)} />
          <button type="submit" className="action primary" disabled={state.busy}>
            {state.saved ? '已儲存' : '儲存'}
          </button>
        </span>
      </label>
      {state.error && <p className="small error">{state.error}</p>}
    </form>
  )
}

function DeleteAccount() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const run = async () => {
    if (!navigator.onLine) {
      setError('需要網路才能刪除帳號')
      return
    }
    if (!confirm('確定要刪除帳號？你的攀登紀錄、收藏、評分、留言和暱稱都會永久刪除，無法復原。')) return
    setBusy(true)
    setError(undefined)
    try {
      await deleteMyAccount()
      alert('帳號和資料已刪除。')
    } catch (err) {
      setError(`刪除失敗（${(err as { code?: string }).code ?? (err as Error).message}）`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="danger-zone">
      <summary>刪除帳號</summary>
      <p className="muted small">永久刪除你的攀登紀錄、收藏、評分、留言和暱稱，以及登入帳號。</p>
      <button className="action danger" onClick={() => void run()} disabled={busy}>
        {busy ? '刪除中…' : '刪除我的帳號與所有資料'}
      </button>
      {error && <p className="small error">{error}</p>}
    </details>
  )
}
