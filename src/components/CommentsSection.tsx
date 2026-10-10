import { useState } from 'react'
import { useCloud } from '../personal/sync'
import { postComment, removeComment, report } from '../social/actions'
import { COMMENT_MAX } from '../social/model'
import { displayName, useComments, useSocial } from '../social/store'
import { SignInPrompt } from './SignInPrompt'

export function CommentsSection({ routeId }: { routeId: string }) {
  const comments = useComments(routeId)
  const social = useSocial()
  const cloud = useCloud()
  const uid = cloud.status === 'signed-in' ? cloud.user?.uid : undefined
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    if (!navigator.onLine) {
      setError('目前沒有網路，連線後再送出')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await postComment(routeId, text)
      setText('')
    } catch (err) {
      setError(`無法送出（${(err as Error).message}）`)
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('刪除這則留言？')) return
    try {
      await removeComment(routeId, id)
    } catch (err) {
      setError(`無法刪除（${(err as Error).message}）`)
    }
  }

  const onReport = async (id: string) => {
    const reason = prompt('檢舉原因（選填）：不實資訊、廣告、人身攻擊…')
    if (reason === null) return
    try {
      await report(routeId, id, reason)
      alert('已送出檢舉，管理員會盡快處理。')
    } catch (err) {
      setError(`無法檢舉（${(err as Error).message}）`)
    }
  }

  return (
    <section className="comments">
      <h2>留言{comments && comments.length > 0 && <span className="muted small"> {comments.length}</span>}</h2>

      {uid ? (
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <textarea
            rows={3}
            maxLength={COMMENT_MAX}
            placeholder="分享 beta、現場狀況、岩質或 bolt 問題…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="comment-form-row">
            <span className="muted small">
              以「{displayName(social.profiles, uid)}」發表 · {text.length}/{COMMENT_MAX}
            </span>
            <button type="submit" className="action primary" disabled={busy || !text.trim()}>
              送出
            </button>
          </div>
          {error && <p className="small error">{error}</p>}
        </form>
      ) : (
        cloud.status !== 'loading' && <SignInPrompt compact message="登入後可以留言。" />
      )}

      {comments === undefined ? (
        <p className="muted small">載入中…</p>
      ) : comments.length === 0 ? (
        <p className="muted small">還沒有留言。</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="comment-meta">
                <strong>{displayName(social.profiles, c.uid)}</strong>
                <span className="muted small">{new Date(c.createdAt).toLocaleDateString('zh-TW')}</span>
                {uid === c.uid ? (
                  <button className="link-button" onClick={() => void onDelete(c.id)}>
                    刪除
                  </button>
                ) : (
                  uid && (
                    <button className="link-button" onClick={() => void onReport(c.id)}>
                      檢舉
                    </button>
                  )
                )}
              </div>
              <p className="pre">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
