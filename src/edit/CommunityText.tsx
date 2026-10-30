import { useState } from 'react'
import { SignInPrompt } from '../components/SignInPrompt'
import { useBackGuard } from './backGuard'
import { useLang } from '../i18n'
import { useCloud } from '../personal/sync'
import { useTextEdits, currentText, type TextTarget } from './textEdits'
import { useLongPress } from './useLongPress'
import { TEXT_MAX, useTextEditor } from './useTextEditor'

/**
 * 區域、路線說明：有岩友修改的版本就顯示最新的那一版，沒有修改時顯示原文（TOCC）；兩者都沒有就不顯示。
 * 誰、何時修改與 TOCC 原文在標題卡右上「更多」選單的修改記錄（TitleTools，電腦版），編輯也從那裡進入。
 * title：區段標題（路線頁不放，直接顯示內容）。
 * 手機版的路線頁（onEdit）：點一下或長按整段就在卡片裡編輯（editing），不換頁；沒有說明時從「更多」選單進入。
 * route：那條路線（記在瀏覽紀錄裡，重新載入、App 被系統關掉再回來時回到編輯）。
 */
export function CommunityText({
  target,
  original,
  title,
  editing,
  onEdit,
  route,
}: {
  target: TextTarget
  original?: string
  title?: string
  editing?: boolean
  onEdit?: (on: boolean) => void
  route?: string
}) {
  const text = currentText(useTextEdits()[target])?.text ?? original
  const press = useLongPress(() => onEdit?.(true))
  if (editing && onEdit)
    return (
      <section className="route-block community-text">
        <InlineTextEditor target={target} original={original ?? ''} route={route} onClose={() => onEdit(false)} />
      </section>
    )
  if (!text) return null
  const body = (
    <>
      {title && <h2>{title}</h2>}
      <p className="pre">{text}</p>
    </>
  )
  return onEdit ? (
    <section className="route-block community-text">
      <div className="community-edit" role="button" tabIndex={0} onClick={() => onEdit(true)} onKeyDown={(e) => e.key === 'Enter' && onEdit(true)} {...press}>
        {body}
      </div>
    </section>
  ) : (
    <section className="route-block community-text">{body}</section>
  )
}

/**
 * 卡片裡的說明編輯：文字框、帶入 TOCC 原文、取消、提交；沒登入時是登入按鈕。
 * 返回手勢關閉編輯、保留草稿（下次編輯接著改）；「取消」才捨棄修改。
 */
function InlineTextEditor({ target, original, route, onClose }: { target: TextTarget; original: string; route?: string; onClose: () => void }) {
  const { t } = useLang()
  const cloud = useCloud()
  const { text, setText, dirty, saving, submit, discard } = useTextEditor(target, original)
  const [error, setError] = useState<string>()
  const close = useBackGuard({ kind: 'text', route }, () => false, onClose)
  const signedIn = cloud.status === 'signed-in'
  const cancel = () => {
    if (dirty && !confirm(t('shape.confirmDiscard'))) return
    discard()
    close()
  }
  const save = async () => {
    setError(undefined)
    try {
      await submit()
      close()
    } catch (err) {
      setError(t('shape.saveFailed', { error: (err as Error).message }))
    }
  }
  return (
    <div className="inline-text-edit">
      {signedIn ? (
        <textarea
          className="inline-text-area"
          value={text}
          maxLength={TEXT_MAX}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          aria-label={t('edit.routeText')}
          placeholder={t('edit.textPlaceholder')}
        />
      ) : (
        cloud.status !== 'loading' && <SignInPrompt />
      )}
      {error && <p className="small error">{error}</p>}
      <div className="inline-text-actions">
        {signedIn && original && text !== original && (
          <button type="button" className="link-button" onClick={() => setText(original)}>
            {t('text.useOriginal')}
          </button>
        )}
        <span className="inline-text-spacer" />
        <button type="button" className="action" onClick={cancel}>
          {t('action.cancel')}
        </button>
        {signedIn && (
          <button type="button" className="action primary" disabled={!dirty || saving} onClick={() => void save()}>
            {t('shape.save')}
          </button>
        )}
      </div>
    </div>
  )
}
