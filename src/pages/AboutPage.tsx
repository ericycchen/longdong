import type { LoadedData } from '../data/dataset'
import { SAFETY_LABEL, SafetyLight } from '../components/SafetyLight'
import type { Safety } from '../data/schema'
import { formatDate } from '../format'
import { href } from '../router'

export function AboutPage({ data }: { data: LoadedData }) {
  const { dataset } = data
  return (
    <article className="prose">
      <nav className="crumbs">
        <a href={href.home()}>龍洞</a>
      </nav>
      <h1>關於</h1>

      <p className="alert">
        本站資料僅供參考。岩壁與固定點狀況隨時可能改變，攀登前請自行檢查現場，並為自己的安全負責。
      </p>

      <h2>離線使用</h2>
      <p>
        第一次開啟後，App 與全部路線資料就會存在手機上，在龍洞沒有訊號的地方也能查詢。
        建議用瀏覽器的「加入主畫面」安裝，iOS 上才不會被系統清掉離線資料。
      </p>

      <h2>資料來源</h2>
      <p>
        路線與 Bolt 資料由{' '}
        <a href={dataset.source.projectUrl} target="_blank" rel="noreferrer">
          {dataset.source.attribution}
        </a>{' '}
        維護於{' '}
        <a href={dataset.source.url} target="_blank" rel="noreferrer">
          Google Sheet
        </a>
        ，本站每日自動同步。發現資料有誤，請聯絡協會更正。
      </p>
      <dl className="kv">
        <dt>資料更新</dt>
        <dd>{formatDate(dataset.updatedAt.slice(0, 10))}</dd>
        <dt>資料版本</dt>
        <dd className="mono">{dataset.version}</dd>
        <dt>資料授權</dt>
        <dd>{dataset.license}</dd>
        <dt>程式授權</dt>
        <dd>MIT</dd>
      </dl>

      <h2>安全評級</h2>
      <dl className="kv legend">
        {(['green', 'yellow', 'red'] as Safety[]).map((s) => (
          <div key={s} className="kv-row">
            <dt>
              <SafetyLight safety={s} />
            </dt>
            <dd>{SAFETY_LABEL[s]}</dd>
          </div>
        ))}
        <div className="kv-row">
          <dt>
            <SafetyLight />
          </dt>
          <dd>尚未評級</dd>
        </div>
      </dl>

      <h2>材質代號</h2>
      <dl className="kv">
        {dataset.hardware.map((h) => (
          <div key={h.code} className="kv-row">
            <dt className="mono">{h.code}</dt>
            <dd>{h.description}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
