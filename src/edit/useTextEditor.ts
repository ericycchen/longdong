import { useEffect, useState } from 'react'
import { withCloud } from '../personal/sync'
import { currentText, loadTextEdits, useTextEdits, type TextTarget } from './textEdits'

export const TEXT_MAX = 3000

const draftKey = (target: TextTarget) => `longdong.textDraft.${target}`

function readDraft(target: TextTarget): string | undefined {
  try {
    return localStorage.getItem(draftKey(target)) ?? undefined
  } catch {
    return undefined
  }
}

function writeDraft(target: TextTarget, text: string | undefined) {
  try {
    if (text === undefined) localStorage.removeItem(draftKey(target))
    else localStorage.setItem(draftKey(target), text)
  } catch {
    /* 私密瀏覽等情況：草稿只留在這個畫面 */
  }
}

/**
 * 區域、路線說明的編輯狀態（編輯模式的說明項目、手機路線頁的卡片內編輯共用）：
 * 文字框從目前顯示的版本開始；版本變了（提交、刪除）而且沒有修改中時跟著換。submit 失敗時丟出錯誤，由畫面顯示。
 * 修改中的文字隨時存在這台裝置（草稿）：離開 App、關掉編輯再回來都還在；提交或 discard 才清掉。
 */
export function useTextEditor(target: TextTarget, original: string) {
  const versions = useTextEdits()[target]
  const shown = currentText(versions)?.text ?? original
  const [text, setTextState] = useState(() => readDraft(target) ?? shown)
  const setText = (next: string) => {
    writeDraft(target, next === shown ? undefined : next)
    setTextState(next)
  }
  const discard = () => {
    writeDraft(target, undefined)
    setTextState(shown)
  }
  const [saving, setSaving] = useState(false)
  const dirty = text !== shown
  useEffect(() => {
    if (!dirty) setTextState(shown)
  }, [shown])

  const submit = async () => {
    setSaving(true)
    try {
      const { m, uid } = await withCloud()
      // 和原文相同時存空字串（表示改回原文）
      await m.addTextEdit(uid, target, text.trim() === original.trim() ? '' : text.trim())
      await loadTextEdits(true)
      writeDraft(target, undefined)
    } finally {
      setSaving(false)
    }
  }
  return { text, setText, dirty, saving, submit, discard, versions: versions ?? [] }
}
