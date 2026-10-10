import { signIn, useCloud } from '../personal/sync'

/** 未登入時顯示的登入按鈕；message 說明登入後能做什麼。compact 為一行文字加連結 */
export function SignInPrompt({ message, compact = false }: { message: string; compact?: boolean }) {
  const cloud = useCloud()
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  if (compact) {
    return (
      <p className="muted small">
        {message}
        {!offline && (
          <button className="link-button inline" onClick={() => void signIn()} disabled={cloud.status === 'loading'}>
            登入
          </button>
        )}
      </p>
    )
  }
  return (
    <div className="signin-prompt">
      <p className="muted small">{message}</p>
      {offline ? (
        <button className="action" disabled>
          需要網路才能登入
        </button>
      ) : (
        <div className="actions">
          <button className="action primary" onClick={() => void signIn('google')} disabled={cloud.status === 'loading'}>
            用 Google 登入
          </button>
          <button className="action facebook" onClick={() => void signIn('facebook')} disabled={cloud.status === 'loading'}>
            用 Facebook 登入
          </button>
        </div>
      )}
      {cloud.error && <p className="small error">{cloud.error}</p>}
    </div>
  )
}
