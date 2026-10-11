import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { BottomNav } from './components/BottomNav'
import { useData } from './data/dataset'
import { relativeTime } from './format'
import { useLang } from './i18n'
import { AboutPage } from './pages/AboutPage'
import { AreaPage, SectorPage } from './pages/AreaPage'
import { HomePage } from './pages/HomePage'
import { MePage } from './pages/MePage'
import { RoutePage } from './pages/RoutePage'
import { SearchPage } from './pages/SearchPage'
import { loadRatings } from './social/store'
import { href, usePage } from './router'

export function App() {
  const page = usePage()
  const state = useData()
  const { t } = useLang()
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // 評分（路線清單顯示平均星等）在背景載入；離線時用 Service Worker 快取的上一份
  useEffect(() => {
    void loadRatings()
  }, [])

  return (
    <>
      <header className="topbar">
        <a className="brand" href={href.home()}>
          <span className="brand-mark" aria-hidden>
            LD
          </span>
          {t('app.title')}
        </a>
      </header>

      {needRefresh && (
        <div className="banner">
          {t('app.updateAvailable')}
          <button onClick={() => updateServiceWorker(true)}>{t('app.update')}</button>
        </div>
      )}

      <main>
        {state.status === 'loading' && <p className="empty muted">{t('app.loading')}</p>}
        {state.status === 'error' && (
          <div className="empty">
            <p>{t('app.loadError', { error: state.error })}</p>
            <p className="muted small">{t('app.firstUseNeedsNetwork')}</p>
          </div>
        )}
        {state.status === 'ready' &&
          (page.name === 'area' ? (
            <AreaPage key={page.id} data={state.data} id={page.id} />
          ) : page.name === 'sector' ? (
            <SectorPage key={page.id} data={state.data} id={page.id} />
          ) : page.name === 'route' ? (
            <RoutePage data={state.data} id={page.id} />
          ) : page.name === 'search' ? (
            <SearchPage data={state.data} />
          ) : page.name === 'me' ? (
            <MePage data={state.data} />
          ) : page.name === 'about' ? (
            <AboutPage data={state.data} />
          ) : (
            <HomePage data={state.data} />
          ))}
      </main>

      {state.status === 'ready' && page.name === 'home' && (
        <footer className="footer muted small">
          {t('footer.updated', { time: relativeTime(state.data.dataset.updatedAt, t) })}
          {offlineReady || navigator.serviceWorker?.controller ? ` · ${t('footer.offlineReady')}` : ''}
          <br />
          {t('footer.source')}
          <a href={state.data.dataset.source.projectUrl} target="_blank" rel="noreferrer">
            {state.data.dataset.source.attribution}
          </a>
          <br />
          {t('footer.disclaimer')} · <a href={href.about()}>{t('footer.about')}</a>
        </footer>
      )}

      <BottomNav page={page} />
    </>
  )
}
