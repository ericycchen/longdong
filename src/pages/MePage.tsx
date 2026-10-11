import { useState } from 'react'
import type { LoadedData } from '../data/dataset'
import { RouteRow } from '../components/RouteRow'
import { FACEBOOK_LOGIN_ENABLED, SignInPrompt } from '../components/SignInPrompt'
import { formatDate, relativeTime } from '../format'
import { TICK_STYLE_LABEL, isSent } from '../personal/model'
import { deleteTick, setFavorite, usePersonal } from '../personal/store'
import { signOut, useCloud } from '../personal/sync'
import { deleteMyAccount, rename } from '../social/actions'
import { NAME_MAX } from '../social/model'
import { displayName, useSocial } from '../social/store'
import { href } from '../router'

type Tab = 'ticks' | 'favorites'

export function MePage({ data }: { data: LoadedData }) {
  const cloud = useCloud()

  return (
    <>
      <h1>我的</h1>
      {cloud.status === 'signed-in' && cloud.user ? (
        <SignedIn data={data} uid={cloud.user.uid} email={cloud.user.email} />
      ) : cloud.status === 'loading' ? (
        <p className="empty muted">載入中…</p>
      ) : (
        <section className="intro-card">
          <h2>登入後可以</h2>
          <ul>
            <li>記錄攀登：日期、Onsight／Flash／Redpoint、心得</li>
            <li>收藏想爬的路線</li>
            <li>替路線評分、留言分享 beta 與現場狀況</li>
            <li>在手機和電腦之間自動同步，沒網路時也能記錄</li>
          </ul>
          <SignInPrompt message={`用 Google${FACEBOOK_LOGIN_ENABLED ? ' 或 Facebook' : ''} 帳號登入，Email 不會公開。`} />
        </section>
      )}
      <p className="small me-links">
        <a href={href.about()}>關於與說明</a>
      </p>
    </>
  )
}

function SignedIn({ data, uid, email }: { data: LoadedData; uid: string; email: string }) {
  const personal = usePersonal()
  const cloud = useCloud()
  const [tab, setTab] = useState<Tab>('ticks')

  const lookup = (id: string) => data.routeById.get(id)
  const sentRoutes = new Set(personal.ticks.filter((t) => isSent(t.style)).map((t) => t.routeId))
  const hardest = [...sentRoutes]
    .map((id) => lookup(id)?.route)
    .filter((r) => r?.gradeValue !== undefined)
    .sort((a, b) => b!.gradeValue! - a!.gradeValue!)[0]

  return (
    <>
      <section className="profile">
        <NameEditor uid={uid} />
        <p className="muted small">
          {email} ·{' '}
          {cloud.syncing
            ? '同步中…'
            : !cloud.connected
              ? '離線中，恢復連線後自動同步'
              : cloud.lastSync
                ? `已同步（${relativeTime(cloud.lastSync)}）`
                : '已連線'}
        </p>
        {cloud.error && <p className="small error">{cloud.error}</p>}
      </section>

      <div className="stats">
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
      </div>

      <div className="chips" role="tablist">
        <button className="chip" role="tab" aria-pressed={tab === 'ticks'} onClick={() => setTab('ticks')}>
          攀登紀錄
        </button>
        <button className="chip" role="tab" aria-pressed={tab === 'favorites'} onClick={() => setTab('favorites')}>
          收藏 {personal.favorites.size > 0 && personal.favorites.size}
        </button>
      </div>

      {tab === 'ticks' &&
        (personal.ticks.length === 0 ? (
          <p className="empty muted">還沒有攀登紀錄。在路線頁按「記錄攀登」就會出現在這裡。</p>
        ) : (
          <ul className="route-list tick-list">
            {personal.ticks.map((t) => {
              const ref = lookup(t.routeId)
              return (
                <li key={t.id} className="row-with-action">
                  <a className="tick-row" href={href.route(t.routeId)}>
                    <span className="tick-date">{formatDate(t.date)}</span>
                    <span className="route-name">
                      <span className="zh">
                        {ref ? `${ref.route.number ? `#${ref.route.number} ` : ''}${ref.route.name.zh}` : `找不到路線（${t.routeId}）`}
                      </span>
                      <span className="en">
                        {TICK_STYLE_LABEL[t.style]}
                        {t.note && ` · ${t.note}`}
                      </span>
                    </span>
                    <span className="grade">{ref?.route.grade}</span>
                  </a>
                  <button
                    className="link-button"
                    aria-label="刪除這筆紀錄"
                    onClick={() => confirm('刪除這筆攀登紀錄？') && deleteTick(t.id)}
                  >
                    刪除
                  </button>
                </li>
              )
            })}
          </ul>
        ))}

      {tab === 'favorites' &&
        (personal.favorites.size === 0 ? (
          <p className="empty muted">還沒有收藏。在路線頁按「☆ 收藏」就會出現在這裡。</p>
        ) : (
          <ul className="route-list">
            {[...personal.favorites].map((id) => {
              const ref = lookup(id)
              return ref ? (
                <RouteRow key={id} item={ref} showPlace />
              ) : (
                <li key={id} className="row-with-action">
                  <span className="tick-row muted small">找不到路線（{id}）</span>
                  <button className="link-button" onClick={() => setFavorite(id, false)}>
                    移除
                  </button>
                </li>
              )
            })}
          </ul>
        ))}

      <div className="actions signout">
        <button
          className="action"
          onClick={() => confirm('登出？這台裝置上的紀錄會清除，下次登入會從雲端載入。') && void signOut()}
        >
          登出
        </button>
      </div>

      <DeleteAccount />
    </>
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
    if (!confirm('確定要刪除帳號？\n你的攀登紀錄、收藏、評分、留言和暱稱都會永久刪除，無法復原。')) return
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

function NameEditor({ uid }: { uid: string }) {
  const social = useSocial()
  const name = displayName(social.profiles, uid)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()

  if (!editing) {
    return (
      <p className="profile-name">
        <strong>{name}</strong>{' '}
        <button
          className="link-button"
          onClick={() => {
            setValue(name)
            setError(undefined)
            setEditing(true)
          }}
        >
          修改暱稱
        </button>
      </p>
    )
  }

  return (
    <form
      className="name-form"
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await rename(value)
          setEditing(false)
        } catch (err) {
          setError((err as Error).message)
        }
      }}
    >
      <input value={value} maxLength={NAME_MAX} onChange={(e) => setValue(e.target.value)} aria-label="暱稱" autoFocus />
      <button type="submit" className="action primary">
        儲存
      </button>
      <button type="button" className="action" onClick={() => setEditing(false)}>
        取消
      </button>
      <p className="muted small">留言和評分會顯示這個暱稱。</p>
      {error && <p className="small error">{error}</p>}
    </form>
  )
}
