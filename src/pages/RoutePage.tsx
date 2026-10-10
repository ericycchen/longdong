import type { LoadedData } from '../data/dataset'
import type { Bolt } from '../data/schema'
import { CommentsSection } from '../components/CommentsSection'
import { PersonalPanel } from '../components/PersonalPanel'
import { RatingSection } from '../components/RatingSection'
import { SafetyLight } from '../components/SafetyLight'
import { StarsBadge } from '../components/Stars'
import { useCloud } from '../personal/sync'
import { FEEL_LABEL, feelConsensus, routeKey, summarize } from '../social/model'
import { useSocial } from '../social/store'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate, typeText, yearsSince } from '../format'
import { href } from '../router'
import { NotFound } from './AreaPage'

export function RoutePage({ data, id }: { data: LoadedData; id: string }) {
  const ref = data.routeById.get(id)
  const signedIn = useCloud().status === 'signed-in'
  const rating = summarize(useSocial().ratings[routeKey(id)])
  if (!ref) return <NotFound />
  const { route, sector, area } = ref
  const danger = route.status === 'closed' || route.status === 'to-remove'
  const pitches = route.pitch ? sector.routes.filter((r) => r.pitch && baseName(r.name.zh) === baseName(route.name.zh)) : []

  return (
    <article className="route">
      <nav className="crumbs">
        <a href={href.home()}>龍洞</a> / <a href={href.area(area.id)}>{area.name.zh}</a> / {sector.name.zh}
      </nav>

      <header className="route-head">
        {route.number && <span className="route-no big">#{route.number}</span>}
        <h1>
          {route.name.zh}
          {route.name.en && <span className="en">{route.name.en}</span>}
        </h1>
        <div className="facts">
          {route.grade && <span className="grade big">{route.grade}</span>}
          {(route.type || route.isFixture) && <span>{typeText(route)}</span>}
          {route.heightM && <span>{route.heightM} m</span>}
        </div>
        {!route.isFixture && (
          <div className="safety-row">
            <SafetyLight safety={route.safety} />
            {rating && (
              <button
                type="button"
                className="rating-link"
                onClick={() => document.getElementById('rating')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <StarsBadge summary={rating} />
                {feelConsensus(rating) && <span className="muted small"> · 體感{FEEL_LABEL[feelConsensus(rating)!]}</span>}
              </button>
            )}
          </div>
        )}
      </header>

      {danger && (
        <p className="alert" role="alert">
          此路線標示為「{route.statusLabel}」，請勿攀登。
        </p>
      )}

      {!route.isFixture && signedIn && <PersonalPanel route={route} />}

      <section className="panel">
        <dl className="kv">
          <dt>路線狀態</dt>
          <dd>
            {route.status ? <StatusBadge status={route.status} /> : <span className="muted">未記錄</span>}
            {route.statusDate && <span className="muted"> {formatDate(route.statusDate)}</span>}
          </dd>
          <dt>最近拉測</dt>
          <dd>
            {route.lastTested ? (
              <>
                {formatDate(route.lastTested)} <span className="muted">（{ageText(route.lastTested)}）</span>
              </>
            ) : (
              <span className="muted">無紀錄</span>
            )}
          </dd>
          {route.boltCount !== undefined && route.boltCount > 0 && (
            <>
              <dt>Bolt 數</dt>
              <dd>{route.boltCount}</dd>
            </>
          )}
          {route.firstAscent && (
            <>
              <dt>首攀</dt>
              <dd className="pre">
                {route.firstAscent}
                {route.firstAscentDate && <span className="muted">{'\n'}{formatDate(route.firstAscentDate)}</span>}
              </dd>
            </>
          )}
        </dl>
      </section>

      {pitches.length > 1 && (
        <section>
          <h2>繩距</h2>
          <ul className="route-list">
            {pitches.map((p) => (
              <li key={p.id}>
                <a className={`pitch-row${p.id === route.id ? ' current' : ''}`} href={href.route(p.id)}>
                  <span className="pitch-no">P{p.pitch}</span>
                  <span className="route-name">
                    <span className="zh">{p.name.zh}</span>
                    {p.heightM && <span className="en">{p.heightM} m</span>}
                  </span>
                  <span className="grade-line">
                    <SafetyLight safety={p.safety} />
                    <span className="grade">{p.grade}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {route.description && (
        <section>
          <h2>路線資訊</h2>
          <p className="pre">{route.description}</p>
        </section>
      )}

      {route.bolts.length > 0 && <BoltTable title="Bolt" bolts={route.bolts} data={data} />}
      {route.anchors.length > 0 && <BoltTable title="Anchor" bolts={route.anchors} data={data} />}

      {route.anchorHardware.length > 0 && (
        <section>
          <h2>Anchor 配件</h2>
          <ul className="plain">
            {route.anchorHardware.map((h, i) => (
              <li key={i}>
                {h.item}
                {h.quantity && ` ×${h.quantity}`}
                {h.spec && <span className="muted"> {h.spec}</span>}
                {h.installed && <span className="muted"> · {formatDate(h.installed)} 安裝</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {route.notes && (
        <section>
          <h2>備註</h2>
          <p className="pre small">{route.notes}</p>
        </section>
      )}

      {!route.isFixture && (
        <div id="rating">
          <RatingSection routeId={route.id} />
        </div>
      )}

      <CommentsSection routeId={route.id} />
    </article>
  )
}

/** 「自由裂隙 | P2 右」→「自由裂隙」，用來找出同一條多繩距路線的各段 */
function baseName(zh: string): string {
  return zh.replace(/\s*\|\s*P\d+.*$/i, '').trim()
}

function ageText(date: string): string {
  const y = yearsSince(date)
  return y === undefined ? '' : y === 0 ? '一年內' : `${y} 年前`
}

function BoltTable({ title, bolts, data }: { title: string; bolts: Bolt[]; data: LoadedData }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="table-wrap">
        <table className="bolts">
          <thead>
            <tr>
              <th>位置</th>
              <th>材質</th>
              <th>安裝</th>
              <th>最近拉測</th>
            </tr>
          </thead>
          <tbody>
            {bolts.map((b) => {
              const desc = data.hardwareByCode.get(b.material)
              const years = yearsSince(b.installed)
              return (
                <tr key={b.position} className={desc ? '' : 'muted'}>
                  <td className="mono">{b.position}</td>
                  <td>
                    {b.material}
                    {desc && <span className="sub">{desc}</span>}
                  </td>
                  <td>
                    {b.installed ? formatDate(b.installed) : '—'}
                    {years !== undefined && <span className="sub">{years} 年</span>}
                  </td>
                  <td>{b.tests[0] ? formatDate(b.tests[0]) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
