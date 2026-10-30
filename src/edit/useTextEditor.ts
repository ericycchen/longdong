import { useEffect, useState } from 'react'
import { withCloud } from '../personal/sync'
import { currentText, loadTextEdits, useTextEdits, type TextTarget } from './textEdits'

export const TEXT_MAX = 3000

/**
 * 區域、路線說明的編輯狀態（編輯模式的說明項目、手機路線頁的卡片內編輯共用）：
 * 文字框從目前顯示的版本開始；版本變了（提交、刪除）而且沒有修改中時跟著換。submit 失敗時丟出錯誤，由畫面顯示。
 */
export function useTextEditor(target: TextTarget, original: string) {
  const versions = useTextEdits()[target]
  const shown = currentText(versions)?.text ?? original
  const [text, setText] = useState(shown)
  const [saving, setSaving] = useState(false)
  const dirty = text !== shown
  useEffect(() => {
    if (!dirty) setText(shown)
  }, [shown])

  const submit = async () => {
    setSaving(true)
    try {
      const { m, uid } = await withCloud()
      // 和原文相同時存空字串（表示改回原文）
      await m.addTextEdit(uid, target, text.trim() === original.trim() ? '' : text.trim())
      await loadTextEdits(true)
    } finally {
      setSaving(false)
    }
  }
  return { text, setText, dirty, saving, submit, versions: versions ?? [] }
}
