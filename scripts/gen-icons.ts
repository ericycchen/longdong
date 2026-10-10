/**
 * 產生 PWA 圖示（public/icons/）。圖形很簡單，直接逐點繪製，不需要額外的影像套件。
 *   npx tsx scripts/gen-icons.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

const OUT = resolve(import.meta.dirname, '../public/icons')
const BG = [0x1f, 0x4e, 0x5f]
const ROCK = [0xf6, 0xf4, 0xef]
const SEA = [0x79, 0xb8, 0xcc]

// 以 0–1 座標描述：一座岩壁（多邊形）加一道海浪線
const ROCK_POLY: [number, number][] = [
  [0.18, 0.72], [0.38, 0.3], [0.5, 0.44], [0.6, 0.24], [0.82, 0.72],
]

function inside(x: number, y: number, poly: [number, number][]): boolean {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function pixel(x: number, y: number): number[] {
  if (inside(x, y, ROCK_POLY)) return ROCK
  const wave = 0.78 + 0.025 * Math.sin(x * Math.PI * 6)
  if (y > wave && y < wave + 0.045 && x > 0.14 && x < 0.86) return SEA
  return BG
}

function png(size: number): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const ss = 3 // 超取樣抗鋸齒
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const c = pixel((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
          for (let k = 0; k < 3; k++) acc[k] += c[k]
        }
      const o = y * (size * 3 + 1) + 1 + x * 3
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(acc[k] / (ss * ss))
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buf: Buffer): number {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

const hex = (c: number[]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="18" fill="${hex(BG)}"/>
<polygon points="${ROCK_POLY.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}" fill="${hex(ROCK)}"/>
<path d="M14 80 Q 22 77 30 80 T 46 80 T 62 80 T 78 80 L 86 80" stroke="${hex(SEA)}" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>
`

mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'icon-192.png'), png(192))
writeFileSync(resolve(OUT, 'icon-512.png'), png(512))
writeFileSync(resolve(OUT, 'icon.svg'), svg)
console.log('icons written to', OUT)
