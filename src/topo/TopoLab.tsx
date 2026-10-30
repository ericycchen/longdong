import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { LoadedData } from '../data/dataset'
import type { Sector } from '../data/schema'
import { localName, useLang } from '../i18n'
import { NotFound } from '../pages/AreaPage'
import { href } from '../router'
import { commit, parseSaved, redo, removePoint, serialize, startHistory, storageKey, undo, type History } from './lab'
import { addLinePoint, moveSharedPoint } from './lines'
import { FULL_CROP, toCropPoint, type Marks, type Point, type TopoEdit, type TopoPhoto } from './model'
import { loadEdits, loadPhotos, useTopoState } from './store'
import { routeLabels } from './TopoSection'
import { px, routeInfo, TopoFrame, TopoLines } from './TopoView'
import { fitSize, MAX_SCALE, type Size } from './viewport'

/** 手指移動超過這個距離（螢幕像素）就是平移或捏合，放開時不當作點了一下 */
const TAP_PX = 8
/** 把手看得到的半徑與手指按得到的範圍（螢幕像素） */
const HANDLE_R = 9
const HANDLE_HIT_R = 22

/**
 * Topo 實驗室：手機上畫線的手勢實驗，縮放與平移交給 react-zoom-pan-pinch（編輯模式用自己寫的 ZoomPane）。
 * 只存在這台裝置上（localStorage），不上傳、不需要登入。開始時是這張照片目前的版本，或上次在這台裝置存的。
 */
export function TopoLab({ data, id }: { data: LoadedData; id?: string }) {
  const { lang, t } = useLang()
  const state = useTopoState()
  useEffect(() => {
    void loadPhotos()
    if (id) void loadEdits(id)
  }, [id])
  if (!state.photos) return <p className="empty muted">{t('app.loading')}</p>
  if (!id) {
    const photos = Object.values(state.photos).sort((a, b) => a.createdAt - b.createdAt)
    return (
      <div className="topo-lab-list">
        <h1>{t('lab.title')}</h1>
        {photos.length === 0 && <p className="empty muted">{t('lab.noPhotos')}</p>}
        <ul>
          {photos.map((p) => {
            const sector = data.sectorById.get(p.sector)?.sector
            return (
              <li key={p.id}>
                <a href={href.topoLab(p.id)}>{sector ? localName(sector.name, lang).main : p.id}</a>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }
  const photo = state.photos[id]
  const edits = state.edits[id]
  const found = photo && data.sectorById.get(photo.sector)
  if (!photo || !found) return <NotFound />
  if (!edits) return <p className="empty muted">{t('app.loading')}</p>
  return <Lab photo={photo} sector={found.sector} latest={edits.at(-1)} />
}

type Saved = { marks: Marks } | { error: string } | undefined

/** 上次在這台裝置存的；沒有存過是 undefined，壞掉的回報錯誤，不當作沒存過 */
function readSaved(photo: string): Saved {
  let text: string | null
  try {
    text = localStorage.getItem(storageKey(photo))
  } catch (err) {
    return { error: (err as Error).message }
  }
  if (text === null) return undefined
  try {
    return { marks: parseSaved(text) }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/** 拖曳中的把手：第幾個點、按下的螢幕位置、目前的位置 */
interface Drag {
  pointer: number
  from: { x: number; y: number }
  index: number
  at: Point
  moved: boolean
}

function Lab({ photo, sector, latest }: { photo: TopoPhoto; sector: Sector; latest?: TopoEdit }) {
  const { lang, t } = useLang()
  const [loaded] = useState(() => readSaved(photo.id))
  const initial = loaded && 'marks' in loaded ? loaded.marks : (latest?.marks ?? {})
  const [history, setHistory] = useState<History>(() => startHistory(initial))
  const [savedText, setSavedText] = useState(() => serialize(initial))
  const [message, setMessage] = useState(loaded && 'error' in loaded ? t('lab.loadError', { error: loaded.error }) : '')
  const [viewing, setViewing] = useState(false)
  const labels = routeLabels(sector)
  const numbered = sector.routes.filter((r) => r.number)
  const [route, setRoute] = useState(numbered[0]?.id ?? '')
  const [picked, setPicked] = useState<number>()
  const [selected, setSelected] = useState<string>()
  const [scale, setScale] = useState(1)
  const crop = latest?.crop
  const marks = history.present
  const line = marks[route]?.line ?? []

  const stage = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState<Size>({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = stage.current!
    const measure = () => setRoom({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const c = crop ?? FULL_CROP
  const aspect = (c.w * photo.width) / (c.h * photo.height)
  const size = fitSize(room, aspect)

  const svg = useRef<SVGSVGElement>(null)
  /** 螢幕位置換成照片上的點；getBoundingClientRect 已經包含縮放與平移 */
  const pointAt = (e: { clientX: number; clientY: number }): Point => {
    const r = svg.current!.getBoundingClientRect()
    return toCropPoint(crop, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }

  const change = (next: Marks) => setHistory((h) => commit(h, next))
  const press = useRef<{ x: number; y: number; multi: boolean }>(undefined)
  const touches = useRef(0)
  const drag = useRef<Drag>(undefined)

  const onStagePointerDown = (e: ReactPointerEvent) => {
    touches.current += 1
    if (touches.current === 1) press.current = { x: e.clientX, y: e.clientY, multi: false }
    else if (press.current) press.current.multi = true
  }
  /**
   * 手指（或滑鼠）放開：一直只有一根、幾乎沒移動，就是點了一下照片——編輯時在選的路線加一個點。
   * 平移、捏合之後放開不算；按在把手上是選取或拖曳（把手自己處理）。不用 click：縮放套件吃掉觸控時不一定會有 click。
   */
  const onStagePointerUp = (e: ReactPointerEvent) => {
    touches.current = Math.max(0, touches.current - 1)
    const p = press.current
    if (touches.current > 0) return
    press.current = undefined
    if (!p || p.multi || Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_PX) return
    if (viewing || !route || (e.target as Element).closest('.topo-lab-handle')) return
    if (picked !== undefined) {
      setPicked(undefined)
      return
    }
    change(addLinePoint(marks, route, pointAt(e), aspect))
  }
  const onStagePointerCancel = () => {
    touches.current = Math.max(0, touches.current - 1)
    press.current = undefined
  }

  /** 拖曳開始前的標記：放開時整段拖曳存成一步復原 */
  const before = useRef<Marks>(undefined)
  const startDrag = (e: ReactPointerEvent<SVGCircleElement>, index: number) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    before.current = marks
    drag.current = { pointer: e.pointerId, from: { x: e.clientX, y: e.clientY }, index, at: line[index], moved: false }
  }
  const moveDrag = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || d.pointer !== e.pointerId) return
    // 手指按下時難免晃一點：超過 TAP_PX 才算拖曳，之前仍是點一下（選取）
    if (!d.moved && Math.hypot(e.clientX - d.from.x, e.clientY - d.from.y) <= TAP_PX) return
    const to = pointAt(e)
    // 拖曳中直接改目前的標記，不留復原
    setHistory((h) => ({ ...h, present: moveSharedPoint(h.present, d.at, to) }))
    drag.current = { ...d, at: to, moved: true }
  }
  /** 放開：沒有移動就是選取（再點一次取消），移動過就存成一步復原 */
  const endDrag = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || d.pointer !== e.pointerId) return
    drag.current = undefined
    if (!d.moved) setPicked(d.index === picked ? undefined : d.index)
    else setHistory((h) => ({ past: [...h.past, before.current!], present: h.present, future: [] }))
  }

  const save = () => {
    const text = serialize(marks)
    try {
      localStorage.setItem(storageKey(photo.id), text)
      setSavedText(text)
      setMessage('')
    } catch (err) {
      setMessage(t('lab.saveError', { error: (err as Error).message }))
    }
  }
  const dirty = serialize(marks) !== savedText
  const info = routeInfo(sector.routes, (r) => localName(r.name, lang).main)

  return (
    <div className="topo-lab">
      <div className="topo-lab-bar">
        <a className="topo-lab-back" href={href.topoLab()} aria-label={t('lab.title')}>
          ‹
        </a>
        {!viewing && (
          <select className="topo-lab-route" value={route} onChange={(e) => (setRoute(e.target.value), setPicked(undefined))} aria-label={t('lab.route')}>
            {numbered.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.number} ${localName(r.name, lang).main} ${r.grade}`}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="topo-lab-btn" onClick={() => (setViewing(!viewing), setPicked(undefined))} aria-pressed={viewing}>
          {viewing ? t('topo.edit') : t('lab.view')}
        </button>
      </div>
      {!viewing && (
        <div className="topo-lab-bar">
          <button type="button" className="topo-lab-btn" disabled={!history.past.length} onClick={() => (setHistory(undo), setPicked(undefined))}>
            {t('topo.undo')}
          </button>
          <button type="button" className="topo-lab-btn" disabled={!history.future.length} onClick={() => (setHistory(redo), setPicked(undefined))}>
            {t('topo.redo')}
          </button>
          <button type="button" className="topo-lab-btn" disabled={picked === undefined} onClick={() => (change(removePoint(marks, route, picked!)), setPicked(undefined))}>
            {t('topo.deletePoint')}
          </button>
          <button type="button" className="topo-lab-btn primary" disabled={!dirty} onClick={save}>
            {dirty ? t('lab.save') : t('lab.saved')}
          </button>
        </div>
      )}
      {message && <p className="topo-lab-message">{message}</p>}
      <div className="topo-lab-stage" ref={stage} onPointerDownCapture={onStagePointerDown} onPointerUpCapture={onStagePointerUp} onPointerCancelCapture={onStagePointerCancel}>
        {size.w > 0 && (
          <TransformWrapper
            minScale={1}
            maxScale={MAX_SCALE}
            doubleClick={{ disabled: true }}
            panning={{ excluded: ['topo-lab-handle'], velocityDisabled: true }}
            onTransformed={(_, s) => setScale(s.scale)}
          >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: size.w, height: size.h, margin: 'auto' }}>
              <div style={{ width: size.w }}>
                <TopoFrame photo={photo} crop={crop} alt={t('topo.alt', { name: localName(sector.name, lang).main })} svgProps={{ ref: svg }}>
                  {(k) => {
                    const z = k / scale
                    return (
                      <>
                        <TopoLines
                          photo={photo}
                          marks={marks}
                          labels={labels}
                          k={z}
                          highlight={viewing ? selected : route}
                          info={info}
                          onPick={viewing ? (id) => setSelected(id === selected ? undefined : id) : undefined}
                          crop={crop}
                        />
                        {!viewing && (
                          <g className="topo-handles" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
                            {line.map((p, i) => {
                              const [x, y] = px(photo, p)
                              return (
                                <g key={i}>
                                  <circle className="topo-lab-handle" cx={x} cy={y} r={HANDLE_HIT_R * z} onPointerDown={(e) => startDrag(e, i)} />
                                  <circle
                                    className={[i === 0 && 'start', picked === i && 'picked'].filter(Boolean).join(' ') || undefined}
                                    cx={x}
                                    cy={y}
                                    r={HANDLE_R * z}
                                    strokeWidth={2 * z}
                                    pointerEvents="none"
                                  />
                                </g>
                              )
                            })}
                          </g>
                        )}
                      </>
                    )
                  }}
                </TopoFrame>
              </div>
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
    </div>
  )
}
