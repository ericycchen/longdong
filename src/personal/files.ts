import type { RouteRef } from '../data/dataset'
import { TICK_STYLE_LABEL, type Tick } from './model'

/** 攀登紀錄轉成 CSV，方便用 Excel / Google 試算表打開（加 BOM，Excel 才認得 UTF-8） */
export function ticksToCsv(ticks: Tick[], lookup: (id: string) => RouteRef | undefined): string {
  const header = ['日期', '路線編號', '路線名稱', '英文名稱', '難度', '種類', '區域', '分區', '方式', '心得', '路線ID']
  const rows = ticks.map((t) => {
    const ref = lookup(t.routeId)
    const r = ref?.route
    return [
      t.date,
      r?.number ?? '',
      r?.name.zh ?? '（找不到路線）',
      r?.name.en ?? '',
      r?.grade ?? '',
      r?.type ?? '',
      ref?.area.name.zh ?? '',
      ref?.sector.name.zh ?? '',
      TICK_STYLE_LABEL[t.style],
      t.note ?? '',
      t.routeId,
    ]
  })
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
