import { useRef, useState, type ReactNode } from 'react'
import { useLang } from '../i18n'
import { href, navigate } from '../router'
import { uploadTopo } from './actions'

/**
 * 選照片上傳到分區，成功後進入那張照片的編輯（onUploaded：在這個畫面接著編輯，不換頁）；
 * pick 開檔案選擇、input 要放進畫面（隱藏的 file input）
 */
export function useTopoUpload(sector: string, onUploaded: (photo: string) => void = (photo) => navigate(href.topo(photo))): { pick: () => void; input: ReactNode; busy: boolean; error?: string } {
  const { t } = useLang()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(undefined)
    try {
      onUploaded(await uploadTopo(sector, file))
    } catch (err) {
      setError(t('topo.uploadError', { error: (err as Error).message }))
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  return {
    pick: () => ref.current?.click(),
    input: <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />,
    busy,
    error,
  }
}

export function UploadButton({ sector, className = 'action', onUploaded }: { sector: string; className?: string; onUploaded?: (photo: string) => void }) {
  const { t } = useLang()
  const { pick, input, busy, error } = useTopoUpload(sector, onUploaded)
  return (
    <div className="topo-upload">
      {input}
      <button type="button" className={className} disabled={busy} onClick={pick}>
        {busy ? t('topo.uploading') : t('topo.add')}
      </button>
      {error && <p className="small error">{error}</p>}
    </div>
  )
}
