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

      <h2>帳號與隱私</h2>
      <p>
        登入使用 Google 或 Facebook 帳號。收藏和攀登紀錄只有你自己看得到；評分和留言會公開，顯示你設定的暱稱，Email 不會公開。
        資料存放在臺灣戶外攀岩協會的 Firebase 專案。不當留言可以按「檢舉」，由管理員處理。
        詳見<a href="./terms.html">服務條款</a>與<a href="./privacy.html">隱私權政策</a>；要刪除帳號與所有資料，請到「我的」頁最下方。
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
