/**
 * 從 Google Sheet 匯入路線資料，輸出 public/data/longdong.json。
 *
 *   npm run import                  # 從線上 Sheet 下載
 *   npm run import -- --from <dir>  # 改讀本機檔案（<area-id>.csv、<area-id>.html、stats.csv）
 *   npm run import -- --check       # 只驗證，不寫檔；資料有變動時 exit code 為 2
 *
 * 內容沒有變動時不會改寫檔案，避免每次排程都產生 commit。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Dataset, type Area } from '../src/data/schema'
import { parseAreaSheet, parseHardwareSheet } from './lib/parse'
import { htmlUrl, parseSafetyHtml } from './lib/safety'
import { AREA_TABS, CRAG, DATA_ATTRIBUTION, DATA_LICENSE, PROJECT_URL, SHEET_ID, SHEET_URL, STATS_GID, csvUrl } from './sheet.config'

const OUT = resolve(import.meta.dirname, '../public/data/longdong.json')

const args = process.argv.slice(2)
const fromDir = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined
const checkOnly = args.includes('--check')

async function load(name: string, gid: string, format: 'csv' | 'html' = 'csv'): Promise<string> {
  if (fromDir) return readFileSync(join(fromDir, `${name}.${format}`), 'utf8')
  const url = format === 'csv' ? csvUrl(gid) : htmlUrl(SHEET_ID, gid)
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (format === 'csv' && text.trimStart().startsWith('<')) {
        throw new Error('收到 HTML 而不是 CSV，Sheet 可能不是公開的')
      }
      return text
    } catch (err) {
      if (attempt >= 3) throw new Error(`下載 ${name}（gid=${gid}）失敗：${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
}

async function main() {
  const [hardwareCsv, areaCsvs, areaHtmls] = await Promise.all([
    load('stats', STATS_GID),
    Promise.all(AREA_TABS.map((t) => load(t.id, t.gid))),
    // 安全評級燈號只存在於字體顏色，CSV 讀不到
    Promise.all(AREA_TABS.map((t) => load(t.id, t.gid, 'html'))),
  ])

  const hardware = parseHardwareSheet(hardwareCsv)
  const warnings: string[] = []
  const areas: Area[] = AREA_TABS.map((tab, i) => {
    const { ratings, unreadable } = parseSafetyHtml(areaHtmls[i], tab.gid)
    if (ratings.size === 0) throw new Error(`[${tab.id}] htmlview 裡找不到任何安全評級燈號，Sheet 版面可能變了`)
    for (const row of unreadable) warnings.push(`[${tab.id}] 第 ${row + 1} 列：安全評級燈號無法判讀`)
    const { warnings: w, ...area } = parseAreaSheet(areaCsvs[i], {
      cragId: CRAG.id,
      areaId: tab.id,
      expectedZh: tab.zh,
      safety: ratings,
    })
    warnings.push(...w)
    return area
  })

  // 路線編號在全龍洞應該唯一。多繩距路線的各段可能共用編號（例如 #242 P1、P2），
  // 以 -p<段數> 區分；其他重複則加序號並提出警告
  const seen = new Map<string, number>()
  for (const route of areas.flatMap((a) => a.sectors.flatMap((s) => s.routes))) {
    const n = (seen.get(route.id) ?? 0) + 1
    seen.set(route.id, n)
    if (n === 1) continue
    if (route.pitch && route.pitch > 1 && !seen.has(`${route.id}-p${route.pitch}`)) {
      route.id = `${route.id}-p${route.pitch}`
      seen.set(route.id, 1)
    } else {
      warnings.push(`路線編號 #${route.number} 重複（${route.name.zh}），id 改為 ${route.id}-${n}`)
      route.id = `${route.id}-${n}`
    }
  }

  // version 涵蓋 version、updatedAt 以外的所有內容，metadata 變動也會重新輸出
  const content = {
    schemaVersion: 2 as const,
    crag: CRAG,
    source: { sheetId: SHEET_ID, url: SHEET_URL, attribution: DATA_ATTRIBUTION, projectUrl: PROJECT_URL },
    license: DATA_LICENSE,
    hardware,
    areas,
  }
  const version = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 12)

  const previous = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as { version?: string; updatedAt?: string }) : undefined
  const changed = previous?.version !== version

  const dataset = Dataset.parse({
    version,
    updatedAt: changed ? new Date().toISOString() : previous!.updatedAt,
    ...content,
  })

  const routes = areas.flatMap((a) => a.sectors.flatMap((s) => s.routes))
  console.log(`區域 ${areas.length}、路線 ${routes.length}、bolt ${routes.reduce((n, r) => n + r.bolts.length + r.anchors.length, 0)}`)
  for (const a of areas) {
    // 表頭的路線數包含固定點項目
    const count = a.sectors.reduce((n, s) => n + s.routes.length, 0)
    const flag = a.summary.routes !== undefined && a.summary.routes !== count ? `（表頭寫 ${a.summary.routes}）` : ''
    console.log(`  ${a.name.zh.padEnd(4, '　')} ${String(count).padStart(3)} 條${flag}`)
  }
  if (warnings.length) {
    console.log(`\n警告 ${warnings.length} 則：`)
    for (const w of warnings) console.log(`  - ${w}`)
  }

  if (!changed) {
    console.log(`\n資料沒有變動（version ${version}）`)
    return
  }
  if (checkOnly) {
    console.log(`\n資料有變動：${previous?.version ?? '(無)'} → ${version}`)
    process.exitCode = 2
    return
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(dataset) + '\n')
  console.log(`\n已寫入 ${OUT}（version ${version}）`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
