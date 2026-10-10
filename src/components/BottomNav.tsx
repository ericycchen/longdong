import type { Page } from '../router'
import { href } from '../router'

const TABS = [
  { key: 'crags', label: '岩場', href: href.home(), icon: 'M3 20l6-11 4 6 3-4 5 9z' },
  { key: 'search', label: '搜尋', href: href.search(), icon: 'M10.5 4a6.5 6.5 0 1 0 4.04 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z' },
  { key: 'me', label: '我的', href: href.me(), icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z' },
] as const

function activeTab(page: Page): (typeof TABS)[number]['key'] {
  if (page.name === 'search') return 'search'
  if (page.name === 'me' || page.name === 'about') return 'me'
  return 'crags'
}

export function BottomNav({ page }: { page: Page }) {
  const active = activeTab(page)
  return (
    <nav className="bottom-nav" aria-label="主選單">
      {TABS.map((t) => (
        <a key={t.key} href={t.href} className={t.key === active ? 'active' : ''} aria-current={t.key === active ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden width="24" height="24">
            <path d={t.icon} fill="currentColor" />
          </svg>
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  )
}
