/**
 * 建置後替每條路線產生分享頁（dist/route/<路線ID>.html，網址 /route/<路線ID>），見 scripts/lib/sharePages.ts：
 * 內容是 dist/index.html，換上這條路線的預覽資訊。不放進 Service Worker 的預先快取（vite.config.ts 的 globIgnores）。
 * 也替每條路線畫分享圖片（dist/og/<路線ID>.png，見 scripts/lib/ogCard.ts：和 App 的路線卡片同樣子，下半部是 Topo）。
 * 區域、分區也有分享頁與圖片（dist/area/<區域ID>.html、dist/sector/<分區ID>.html，圖片在 dist/og/area/…、dist/og/sector/…）。
 * Topo 從 Realtime Database 讀（部署時的最新版本）；讀不到時印警告，分享圖片的下半部改用地圖。
 * 地圖、路線清單、編輯模式也各有分享頁與圖片（dist/map.html、dist/og/map.png、dist/edit.html 等）；
 * 網站本身（dist/index.html，首頁與其他頁面共用）的分享圖片是 dist/og/home.png。
 * 圖片要用的字型（Noto Sans、Noto Sans TC，見 scripts/install-og-fonts.sh；Windows 用 Segoe UI、微軟正黑體）找不到時：
 * CI 直接失敗；本機只印警告，分享頁改用網站圖示。
 * OG_IMAGE_LIMIT=n：路線的圖片只畫前 n 張（PR 的 CI 用，確認畫得出來就好；部署時畫全部）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { indexDataset } from '../src/data/dataset'
import type { Dataset } from '../src/data/schema'
import { sharePagePath } from '../src/share'
import { areaCardPng, loadOgTopos, routeCardPng, sectorCardPng, topoForRoute, topoForSector, type OgTopo } from './lib/ogCard'
import { checklistPageSvg, editMarkAt, editPageSvg, findOgFonts, homePageSvg, loadOgMap, mapPageSvg, ogImagePng } from './lib/ogImage'
import { ogImagePath, pageShareHtml, sharePageHtml, siteShareHtml } from './lib/sharePages'
import { SITE_URL } from './sheet.config'

// 開發站（VITE_CHANNEL=dev）的分享頁用開發站自己的網址：圖片、og:url 指向正式站的話，
// 正式站還沒發布這些圖片，Facebook 抓到的是網頁而不是圖片
const site = process.env.VITE_CHANNEL === 'dev' ? 'https://longdong-dev.web.app/' : SITE_URL

const dataset = JSON.parse(readFileSync('dist/data/longdong.json', 'utf8')) as Dataset
const shell = readFileSync('dist/index.html', 'utf8')
const { routes } = indexDataset(dataset)

const withImage = Boolean(findOgFonts())
if (!withImage) {
  const message = '找不到分享圖片的字型（Linux 請執行 scripts/install-og-fonts.sh）'
  if (process.env.CI) throw new Error(message)
  console.warn(`${message}，分享頁改用網站圖示`)
}
const map = withImage ? loadOgMap('dist/rescue') : undefined
const imageLimit = Number(process.env.OG_IMAGE_LIMIT) || Infinity
// 地圖上各大區域的顏色（Sheet 上的區域色），key 是區域 ID 的最後一段（與 areas.geojson 相同）
const areaColors = Object.fromEntries(dataset.areas.flatMap((a) => (a.color ? [[a.id.split('/').pop()!, a.color]] : [])))

const write = (file: string, content: string | Buffer) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}
let topos: OgTopo[] = []
if (map) {
  try {
    topos = await loadOgTopos()
  } catch (err) {
    console.warn(`讀不到 Topo（${(err as Error).message}），分享圖片的下半部改用地圖`)
  }
}
for (const [i, ref] of routes.entries()) {
  if (map && i < imageLimit) write(join('dist', ogImagePath(ref.route.id)), await routeCardPng(ref.route, ref.area, ref.sector, map, dataset.crag.name, areaColors, topoForRoute(topos, ref.route)))
  write(join('dist', `${sharePagePath(ref.route.id)}.html`), sharePageHtml(ref, site, shell, withImage))
}

// 區域、分區的分享頁與圖片（網址同 App 的 href.area、href.sector：/area/<區域ID>、/sector/<分區ID>）
if (map) {
  for (const area of dataset.areas) {
    const count = (n: number) => `${n} 條路線`
    const routesOf = (s: { routes: { isFixture?: boolean }[] }) => s.routes.filter((r) => !r.isFixture).length
    const single = area.sectors.length === 1 ? area.sectors[0] : undefined
    const areaPath = `area/${area.id}`
    write(join('dist', 'og', `${areaPath}.png`), await areaCardPng(area, map, dataset.crag.name, areaColors, single && topoForSector(topos, single)))
    const areaFacts = [area.sectors.length > 1 && `${area.sectors.length} 個分區`, count(area.sectors.reduce((n, s) => n + routesOf(s), 0))].filter(Boolean).join(' · ')
    write(join('dist', `${areaPath}.html`), pageShareHtml({ path: areaPath, title: `${area.name.zh}｜${dataset.crag.name.zh}`, description: areaFacts }, site, shell))
    for (const sector of area.sectors) {
      const sectorPath = `sector/${sector.id}`
      write(join('dist', 'og', `${sectorPath}.png`), await sectorCardPng(area, sector, map, dataset.crag.name, areaColors, topoForSector(topos, sector)))
      write(
        join('dist', `${sectorPath}.html`),
        pageShareHtml({ path: sectorPath, title: `${sector.name.zh}｜${dataset.crag.name.zh} ${area.name.zh}`, description: count(routesOf(sector)) }, site, shell),
      )
    }
  }
}

// 地圖、路線清單：有字型時才產生（沒有圖片的話，用 index.html 本身的預覽就好）
if (map) {
  const area = dataset.areas.find((a) => a.id.endsWith('/golden-valley')) ?? dataset.areas[0]
  // 路線數與首頁相同：不算固定點（垂降站等）
  const routeCount = routes.filter((r) => !r.route.isFixture).length
  const pages = [
    {
      path: 'map',
      title: '龍洞地圖',
      description: `${dataset.areas.length} 個區域、${routeCount} 條路線的位置，救援點與急救器材，離線可用`,
      svg: mapPageSvg(map, areaColors, { areas: dataset.areas.length, routes: routeCount }),
    },
    // 編輯模式：/edit 與 /edit/**（firebase.json 的 rewrites）都用這一頁，號召岩友一起修改
    {
      path: 'edit',
      title: '龍洞，等你來修改：一起修改龍洞攀岩資料庫',
      description: '對照航照修正地圖與步道、在岩壁照片上畫路線、補充路線說明；登入就能修改，每個版本都保留',
      svg: editPageSvg(map, areaColors),
      markAt: editMarkAt,
    },
    {
      path: 'checklist',
      title: '路線清單',
      description: '記錄每條路線的最佳攀登（OS、RP、TR）與評分',
      svg: checklistPageSvg(area, area.sectors[0]),
    },
  ]
  for (const { svg, markAt, ...page } of pages) {
    write(join('dist', 'og', `${page.path}.png`), await ogImagePng(svg, markAt))
    write(join('dist', `${page.path}.html`), pageShareHtml(page, site, shell))
  }
  // 最後才改 index.html：上面的分享頁都是拿原本的 index.html 來換
  write(join('dist', 'og', 'home.png'), await ogImagePng(homePageSvg(map, areaColors, { areas: dataset.areas.length, routes: routeCount })))
  write(join('dist', 'index.html'), siteShareHtml(site, shell))
}
console.log(`分享頁：${routes.length} 條路線${withImage ? `（含分享圖片，${topos.length} 張 Topo）、區域、分區、地圖、路線清單、編輯模式` : ''}`)
