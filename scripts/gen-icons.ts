/**
 * 產生 App 圖示（public/icons/）：取臺灣戶外攀岩協會（TOCC）標誌中央的
 * 「臺灣島＋攀岩者」圖形，放在白底上，下方加上「LongDong」字樣。
 * 標誌外圈文字在手機桌面尺寸下無法辨識，所以不用。
 *
 * 字樣使用系統字型（Segoe UI Bold），在不同電腦上重新產生可能略有差異；圖示已 commit 進 repo。
 *
 * 輸出兩種：一般圖示（滿版）與 maskable 圖示（Android 會裁成圓形等形狀，
 * 所以把整個圖案縮到中央 80% 的安全區內）。
 *   npx tsx scripts/gen-icons.ts
 *
 * 來源：assets/tocc-logo.png（1134×1134，取自 tocc-climbing.org）。
 * 輸出為滿版方形，可同時當作 maskable 圖示：圖形落在中央 80% 的安全區內。
 */
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'public/icons')
const LOGO = readFileSync(resolve(ROOT, 'assets/tocc-logo.png'))
const LOGO_SIZE = 1134

// 臺灣島在原圖中的範圍（像素）
const ISLAND = { x: 385, y: 342, width: 320, height: 525 }
// 沿著島外緣、留一點邊的多邊形（原圖座標），用來排除外圈文字
const ISLAND_OUTLINE = [
  [628, 325], [715, 375], [718, 565], [640, 710], [575, 800], [545, 885], [485, 880],
  [455, 810], [415, 730], [380, 665], [378, 575], [425, 505], [478, 455], [530, 370],
]
// 島的高度與中心在 512 畫布上的位置
const TARGET_HEIGHT = 330
const CENTER = { x: 256, y: 192 }

/** favicon 太小、字看不清楚，只放島（置中、放大） */
function svg(maskable: boolean, withText = true): string {
  const height = withText ? TARGET_HEIGHT : 470
  const center = withText ? CENTER : { x: 256, y: 256 }
  const scale = height / ISLAND.height
  const x = center.x - (ISLAND.x + ISLAND.width / 2) * scale
  const y = center.y - (ISLAND.y + ISLAND.height / 2) * scale
  const href = `data:image/png;base64,${LOGO.toString('base64')}`
  const points = ISLAND_OUTLINE.map((p) => p.join(',')).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">
<defs><clipPath id="island"><polygon points="${points}"/></clipPath></defs>
<rect width="512" height="512" fill="#ffffff"/>
<g transform="${maskable ? 'translate(51.2 51.2) scale(0.8)' : ''}">
<g transform="translate(${x} ${y}) scale(${scale})">
  <image clip-path="url(#island)" width="${LOGO_SIZE}" height="${LOGO_SIZE}" xlink:href="${href}"/>
</g>
${withText ? '' : '<!--'}<text x="256" y="452" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="700" font-size="84" fill="#000000">LongDong</text>${withText ? '' : '-->'}
</g>
</svg>`
}

function png(size: number, maskable = false, withText = true): Buffer {
  return new Resvg(svg(maskable, withText), { fitTo: { mode: 'width', value: size } }).render().asPng()
}

mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'icon-512.png'), png(512))
writeFileSync(resolve(OUT, 'icon-192.png'), png(192))
writeFileSync(resolve(OUT, 'icon-maskable-512.png'), png(512, true))
writeFileSync(resolve(OUT, 'favicon-48.png'), png(48, false, false))
console.log('icons written to', OUT)
