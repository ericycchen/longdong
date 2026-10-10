import type { Route } from '../../src/data/schema'

export type IdSource = 'legacy' | 'sheet'

export interface PreviousIds {
  idSource?: IdSource
  routeIds: string[]
}

/**
 * 路線ID 的防呆檢查，回傳錯誤訊息（有錯就不應發布）：
 * - 改用 Sheet 的「路線ID」後，不可重複
 * - 已經用 Sheet 的「路線ID」發布過的 ID，之後不可消失（除非列在 retired，表示路線確實已移除）
 *
 * 從舊規則切換到「路線ID」的那一次不檢查消失（舊 ID 本來就會全部換掉）。
 */
export function checkRouteIds(idSource: IdSource, routes: Route[], previous: PreviousIds | undefined, retired: string[]): string[] {
  const errors: string[] = []
  if (idSource === 'sheet') {
    const seen = new Map<string, Route>()
    for (const r of routes) {
      const other = seen.get(r.id)
      if (other) errors.push(`路線ID ${r.id} 重複：${other.name.zh}、${r.name.zh}`)
      seen.set(r.id, r)
    }
  }
  if (idSource === 'sheet' && previous?.idSource === 'sheet') {
    const current = new Set(routes.map((r) => r.id))
    const allowed = new Set(retired)
    for (const id of previous.routeIds) {
      if (!current.has(id) && !allowed.has(id)) {
        errors.push(`已發布的路線ID ${id} 不見了（Sheet 上的 ID 被改掉或清除？若路線確實已移除，請加入 scripts/retired-ids.ts）`)
      }
    }
  }
  return errors
}
