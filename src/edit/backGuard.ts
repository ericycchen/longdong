import { useEffect, useRef } from 'react'

/** 手機就地編輯記在瀏覽紀錄裡的狀態：哪一條路線、編輯什麼（重新載入、App 被系統關掉再回來時恢復） */
export interface EditOverlay {
  kind: 'text' | 'topo'
  /** 從路線頁打開時是那條路線 */
  route?: string
  photo?: string
  /** Topo 編輯器裡選的路線 */
  selected?: string
}

const KEY = 'editOverlay'

/** 目前這筆瀏覽紀錄記著的就地編輯（沒有時 undefined） */
export function savedOverlay(): EditOverlay | undefined {
  return (history.state as Record<string, unknown> | null)?.[KEY] as EditOverlay | undefined
}

/**
 * 手機就地編輯的返回手勢（Android 返回鍵、iOS 從左緣滑回）：打開時多一筆網址不變的瀏覽紀錄，記著 overlay（之後有變也跟著更新）；
 * 返回時先問 onBack：回傳 true 表示處理掉了（關掉面板、結束畫線），留在編輯器（補回那一筆）；否則關閉（onClose）。
 * 回傳的 close 給關閉按鈕用：退掉多的那一筆再關閉，不會留一筆「返回後又打開編輯器」的紀錄。
 * 重新載入後這一筆已經在了（savedOverlay），不再多加。
 */
export function useBackGuard(overlay: EditOverlay, onBack: () => boolean, onClose: () => void): () => void {
  const latest = useRef(overlay)
  const back = useRef(onBack)
  const close = useRef(onClose)
  latest.current = overlay
  back.current = onBack
  close.current = onClose
  const closing = useRef(false)
  const json = JSON.stringify(overlay)
  // 之後有變才更新：剛打開（例如重新載入後先顯示的載入畫面）不能蓋掉記著的狀態
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else if (savedOverlay()) history.replaceState({ ...history.state, [KEY]: latest.current }, '')
  }, [json])
  useEffect(() => {
    if (!savedOverlay()) {
      // 底下那一筆的捲動位置拿掉：返回時頁面停在原地（router 的 scrollAfter）
      const { scroll: _scroll, ...rest } = (history.state ?? {}) as Record<string, unknown>
      history.replaceState(rest, '')
      history.pushState({ ...rest, [KEY]: latest.current }, '')
    }
    const onPop = () => {
      if (savedOverlay()) return
      if (!closing.current && back.current()) history.pushState({ ...history.state, [KEY]: latest.current }, '')
      else close.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return () => {
    if (!savedOverlay()) return close.current()
    closing.current = true
    history.back()
  }
}
