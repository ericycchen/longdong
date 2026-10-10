import { z } from 'zod'

/**
 * 資料格式定義。匯入程式用它驗證，前端只用 `import type` 取得型別。
 * 日期一律是部分 ISO 字串："YYYY"、"YYYY-MM" 或 "YYYY-MM-DD"。
 */

const PartialDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/)

export const LocalizedName = z.object({
  zh: z.string().min(1),
  en: z.string().optional(),
})

export const RouteType = z.enum(['sport', 'trad', 'toprope', 'boulder', 'mixed'])

export const RouteStatus = z.enum([
  'tested', // 已拉測
  'rebolted', // 已更新
  'needs-test', // 待拉測
  'needs-rebolt', // 待更新
  'closed', // 路線封閉
  'to-remove', // 待移除
  'unknown', // 待查、待確認
])

export const Bolt = z.object({
  /** B01…B18 是路線上的 bolt，A01…A04 是 anchor */
  position: z.string().regex(/^[AB]\d{2}$/),
  /** 材質代號（316-TW、Ti-U…）或特殊值（共用、無 Anchor、天然固定點、待查…） */
  material: z.string(),
  installed: PartialDate.optional(),
  /** 拉測日期，新到舊 */
  tests: z.array(PartialDate),
})

export const AnchorHardware = z.object({
  item: z.string(),
  quantity: z.number().int().positive().optional(),
  spec: z.string().optional(),
  installed: PartialDate.optional(),
})

export const Route = z.object({
  /** r523、r100.1；未編號項目為 <區域>-x<序號> */
  id: z.string().regex(/^[a-z0-9.-]+$/),
  /** 官方路線編號，例如 "523"、"100.1"；未編號（Sheet 上為 # 0）時省略 */
  number: z.string().optional(),
  /** 沒有難度和種類的項目，例如救援固定點、私設固定點 */
  isFixture: z.boolean(),
  name: LocalizedName,
  grade: z.string().optional(),
  /** 用來排序和篩選的難度數值，5.10a = 40，5.10b = 41… */
  gradeValue: z.number().optional(),
  type: RouteType.optional(),
  heightM: z.number().positive().optional(),
  firstAscent: z.string().optional(),
  firstAscentDate: PartialDate.optional(),
  description: z.string().optional(),
  safety: z.string().optional(),
  bolts: z.array(Bolt),
  anchors: z.array(Bolt),
  anchorHardware: z.array(AnchorHardware),
  boltCount: z.number().int().nonnegative().optional(),
  status: RouteStatus.optional(),
  statusLabel: z.string().optional(),
  statusDate: PartialDate.optional(),
  /** 所有 bolt 和 anchor 中最近一次拉測日期 */
  lastTested: PartialDate.optional(),
  notes: z.string().optional(),
})

export const Sector = z.object({
  id: z.string(),
  name: LocalizedName,
  routes: z.array(Route),
})

export const Area = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedName,
  /** Sheet 表頭上的統計數字 */
  summary: z.object({ bolts: z.number().optional(), routes: z.number().optional() }),
  notes: z.array(z.string()),
  sectors: z.array(Sector),
})

export const Hardware = z.object({
  code: z.string(),
  description: z.string(),
})

export const Dataset = z.object({
  schemaVersion: z.literal(1),
  /** 內容雜湊，資料沒變時維持不變 */
  version: z.string(),
  /** 資料內容最後一次變動的時間（ISO 8601） */
  updatedAt: z.string(),
  source: z.object({ sheetId: z.string(), url: z.string().url() }),
  license: z.string(),
  hardware: z.array(Hardware),
  areas: z.array(Area),
})

export type LocalizedName = z.infer<typeof LocalizedName>
export type RouteType = z.infer<typeof RouteType>
export type RouteStatus = z.infer<typeof RouteStatus>
export type Bolt = z.infer<typeof Bolt>
export type AnchorHardware = z.infer<typeof AnchorHardware>
export type Route = z.infer<typeof Route>
export type Sector = z.infer<typeof Sector>
export type Area = z.infer<typeof Area>
export type Hardware = z.infer<typeof Hardware>
export type Dataset = z.infer<typeof Dataset>
