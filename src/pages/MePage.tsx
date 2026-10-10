import { useRef, useState } from 'react'
import type { LoadedData } from '../data/dataset'
import { RouteRow } from '../components/RouteRow'
import { formatDate } from '../format'
import { downloadFile, ticksToCsv } from '../personal/files'
import { TICK_STYLE_LABEL, isSent, parseExport, today } from '../personal/model'
import { exportAll, importAll, usePersonal } from '../personal/store'
import { href } from '../router'

type Tab = 'ticks' | 'favorites'

export function MePage({ data }: { data: LoadedData }) {
  const personal = usePersonal()
  const [tab, setTab] = useState<Tab>('ticks')
  const [message, setMessage] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)

  if (personal.error) {
    return (
      <div className="empty">
        <p>這個瀏覽器無法儲存個人資料（{personal.error}）。</p>
        <p className="muted small">私密瀏覽模式通常不支援，請改用一般模式。</p>
      </div>
    )
  }

  const lookup = (id: string) => data.routeById.get(id)
  const sentRoutes = new Set(personal.ticks.filter((t) => isSent(t.style)).map((t) => t.routeId))
  const hardest = [...sentRoutes]
    .map((id) => lookup(id)?.route)
    .filter((r) => r?.gradeValue !== undefined)
    .sort((a, b) => b!.gradeValue! - a!.gradeValue!)[0]

  const exportJson = async () => {
    const backup = await exportAll()
    downloadFile(`longdong-backup-${today()}.json`, JSON.stringify(backup, null, 1), 'application/json')
  }
  const exportCsv = () =>
    downloadFile(`longdong-ticks-${today()}.csv`, ticksToCsv(personal.ticks, lookup), 'text/csv;charset=utf-8')

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const result = await importAll(parseExport(JSON.parse(await file.text())))
      setMessage(`已匯入：收藏 ${result.favorites} 筆、攀登紀錄 ${result.ticks} 筆有更新`)
    } catch (err) {
      setMessage(err instanceof SyntaxError ? '這不是有效的備份檔（無法讀取 JSON）' : (err as Error).message)
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <>
      <nav className="crumbs">
        <a href={href.home()}>龍洞</a>
      </nav>
      <h1>我的紀錄</h1>

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
                <li key={t.id}>
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
                <li key={id} className="muted small route-row">
                  找不到路線（{id}）
                </li>
              )
            })}
          </ul>
        ))}

      <section className="backup">
        <h2>備份</h2>
        <p className="muted small">
          收藏和攀登紀錄只存在這支手機的瀏覽器裡，不會上傳。清除瀏覽器資料或換手機前，請先匯出備份；
          iPhone 請先「加入主畫面」，資料才不會被系統清掉。
        </p>
        <div className="actions">
          <button className="action" onClick={exportJson}>
            匯出備份
          </button>
          <button className="action" onClick={() => fileInput.current?.click()}>
            匯入備份
          </button>
          <button className="action" onClick={exportCsv} disabled={personal.ticks.length === 0}>
            匯出 CSV
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
        </div>
        {message && <p className="small">{message}</p>}
      </section>
    </>
  )
}
