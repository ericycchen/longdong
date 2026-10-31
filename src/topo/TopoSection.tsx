import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Sector } from '../data/schema'
import { localName, useLang } from '../i18n'
import { useWide } from '../layout'
import { useLongPress } from '../edit/useLongPress'
import { useRouteLink } from '../router'
import { fillShared } from './lines'
import { FULL_CROP } from './model'
import { useSectorTopos, type SectorTopo } from './store'
import { BoltToggle, useShowBolts } from './BoltToggle'
import { TopoFullscreen } from './TopoFullscreen'
import { px, RouteReveal, routeInfo, TopoFrame, TopoLines } from './TopoView'
import { routeCrop } from './viewport'
import { ZoomPane } from './ZoomPane'

/** 路線 ID → 照片上顯示的編號（沒有編號的固定點等不顯示） */
export function routeLabels(sector: Sector): Map<string, string> {
  return new Map(sector.routes.filter((r) => r.number).map((r) => [r.id, r.number!]))
}

/**
 * 一張 Topo 的照片與線：電腦版可以縮放、拖曳平移（Ctrl＋滾輪、右下角的按鈕、+／-／0），手機用全螢幕（雙指縮放）。
 * render 收到「一個螢幕像素等於幾個照片像素」，線與編號依此維持相同的螢幕大小。
 */
function Photo({ topo, alt, render }: { topo: SectorTopo; alt: string; render: (k: number) => ReactNode }) {
  const wide = useWide()
  const frame = (zoom: number) => (
    <TopoFrame photo={topo.photo} crop={topo.latest?.crop} alt={alt}>
      {(k) => render(k / zoom)}
    </TopoFrame>
  )
  return wide ? <ZoomPane viewing>{frame}</ZoomPane> : frame(1)
}

/** 分區頁：這個分區的所有 Topo，點線段換到那條路線；手機版（onEdit）長按照片在這一頁編輯 */
export function SectorTopos({ sector, onEdit }: { sector: Sector; onEdit?: (photo: string) => void }) {
  const { lang, t } = useLang()
  const topos = useSectorTopos(sector.id)
  const { link, selected } = useRouteLink()
  const [showBolts] = useShowBolts()
  if (!topos || topos.length === 0) return null
  const labels = routeLabels(sector)
  const info = routeInfo(sector.routes, (r) => localName(r.name, lang).main)
  return (
    <section className="topos" aria-label={t('topo.title')}>
      {topos.map((topo) => (
        <EditableFigure key={topo.photo.id} onEdit={onEdit && (() => onEdit(topo.photo.id))}>
          <Photo
            topo={topo}
            alt={t('topo.alt', { name: localName(sector.name, lang).main })}
            render={(k) =>
              topo.latest && (
                <TopoLines
                  photo={topo.photo}
                  marks={fillShared(topo.latest.marks, sector.routes)}
                  labels={labels}
                  k={k}
                  highlight={selected}
                  bolts={showBolts ? (selected ? [selected] : Object.keys(topo.latest.marks)) : []}
                  info={info}
                  link={link}
                  crop={topo.latest.crop}
                />
              )
            }
          />
          {topo.latest && <FullscreenButton topo={topo} sector={sector} initial={selected} />}
        </EditableFigure>
      ))}
    </section>
  )
}

/**
 * 路線頁：有標記這條路線的 Topo（直接放在卡片裡，沒有標題、沒有按鈕），這條路線是唯一的主角：
 * 照片放大到這條路線附近、灰階並染上區域的顏色，只有這條路線周圍是原色；其他路線淡淡的、不標編號。
 * 點照片開全螢幕；手機版（onEdit）長按在這一頁編輯這張照片；沒有 Topo 時整段不顯示。
 */
export function RouteTopos({ sector, routeId, onEdit }: { sector: Sector; routeId: string; onEdit?: (photo: string) => void }) {
  const { lang, t } = useLang()
  const topos = useSectorTopos(sector.id)?.filter((x) => x.latest?.marks[routeId])
  const [showBolts] = useShowBolts()
  const [open, setOpen] = useState<SectorTopo>()
  if (!topos || topos.length === 0) return null
  const labels = routeLabels(sector)
  const info = routeInfo(sector.routes, (r) => localName(r.name, lang).main)
  return (
    <section className="route-block topos" aria-label={t('topo.title')}>
      {topos.map((topo) => {
        const marks = fillShared(topo.latest!.marks, sector.routes)
        const crop = routeCrop(topo.photo, topo.latest!.crop ?? FULL_CROP, marks[routeId])
        const line = marks[routeId]?.line
        return (
          <EditableFigure key={topo.photo.id} className="topo route-topo" onEdit={onEdit && (() => onEdit(topo.photo.id))} onOpen={() => setOpen(topo)} label={t('topo.fullscreen')}>
            <TopoFrame photo={topo.photo} crop={crop} alt={t('topo.alt', { name: localName(sector.name, lang).main })}>
              {(k) => (
                <>
                  {line && line.length >= 2 && <RouteReveal photo={topo.photo} line={line} width={0.14 * px(topo.photo, [crop.w, 0])[0]} />}
                  <TopoLines photo={topo.photo} marks={marks} labels={labels} k={k} highlight={routeId} bolts={showBolts ? [routeId] : []} info={info} crop={crop} solo />
                </>
              )}
            </TopoFrame>
          </EditableFigure>
        )
      })}
      {open && (
        <TopoFullscreen
          photo={open.photo}
          crop={open.latest!.crop}
          marks={open.latest!.marks}
          labels={labels}
          routes={sector.routes}
          initial={routeId}
          onClose={() => setOpen(undefined)}
        />
      )}
    </section>
  )
}

/** 一張 Topo；onEdit 有值時長按進入編輯；onOpen 有值時整張是按鈕（點了開全螢幕） */
function EditableFigure({ onEdit, onOpen, label, className = 'topo', children }: { onEdit?: () => void; onOpen?: () => void; label?: string; className?: string; children: ReactNode }) {
  const press = useLongPress(() => onEdit?.())
  return (
    <figure
      className={className}
      {...(onEdit ? press : {})}
      {...(onOpen && {
        role: 'button',
        tabIndex: 0,
        'aria-label': label,
        onClick: onOpen,
        onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen()),
      })}
    >
      {children}
    </figure>
  )
}

/** 照片右上角的全螢幕按鈕（左邊是顯示／隱藏 bolt 的按鈕）；全螢幕裡點路線只切換高亮，不離開 */
function FullscreenButton({ topo, sector, initial }: { topo: SectorTopo; sector: Sector; initial?: string }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* bolt 只在有標記的照片上有意義 */}
      {Object.values(topo.latest!.marks).some((m) => Object.keys(m.bolts ?? {}).length > 0) && <BoltToggle />}
      <button type="button" className="topo-full-open" aria-label={t('topo.fullscreen')} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
      {open && (
        <TopoFullscreen
          photo={topo.photo}
          crop={topo.latest!.crop}
          marks={topo.latest!.marks}
          labels={routeLabels(sector)}
          routes={sector.routes}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
