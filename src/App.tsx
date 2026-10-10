import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useData } from './data/dataset'
import { relativeTime } from './format'
import { AboutPage } from './pages/AboutPage'
import { AreaPage } from './pages/AreaPage'
import { HomePage } from './pages/HomePage'
import { RoutePage } from './pages/RoutePage'
import { href, usePage } from './router'

export function App() {
  const page = usePage()
  const state = useData()
  const online = useOnline()
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <>
      <header className="topbar">
        <a className="brand" href={href.home()}>
          龍洞攀岩資料庫
        </a>
        <span className={`net ${online ? 'on' : 'off'}`}>{online ? '連線中' : '離線'}</span>
        <a className="about-link" href={href.about()}>
          關於
        </a>
      </header>

      {needRefresh && (
        <div className="banner">
          有新版本的路線資料
          <button onClick={() => updateServiceWorker(true)}>更新</button>
        </div>
      )}

      <main>
        {state.status === 'loading' && <p className="empty muted">載入中…</p>}
        {state.status === 'error' && (
          <div className="empty">
            <p>無法載入路線資料（{state.error}）。</p>
            <p className="muted small">第一次使用需要網路連線，下載完成後即可離線使用。</p>
          </div>
        )}
        {state.status === 'ready' &&
          (page.name === 'area' ? (
            <AreaPage key={page.id} data={state.data} id={page.id} />
          ) : page.name === 'route' ? (
            <RoutePage data={state.data} id={page.id} />
          ) : page.name === 'about' ? (
            <AboutPage data={state.data} />
          ) : (
            <HomePage data={state.data} />
          ))}
      </main>

      {state.status === 'ready' && (
        <footer className="footer muted small">
          資料更新於 {relativeTime(state.data.dataset.updatedAt)}
          {offlineReady || navigator.serviceWorker?.controller ? ' · 已可離線使用' : ''}
          <br />
          資料來源：
          <a href={state.data.dataset.source.projectUrl} target="_blank" rel="noreferrer">
            {state.data.dataset.source.attribution}
          </a>
          <br />
          僅供參考，攀登前請自行確認現場狀況
        </footer>
      )}
    </>
  )
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}
