# 龍洞攀岩資料庫

龍洞攀岩路線與 Bolt 資訊的離線優先 Web App（PWA）。龍洞很多岩場沒有手機訊號，所以 App 和全部路線資料會在第一次開啟時存到手機上，之後不用網路也能查詢。

路線與 Bolt 資料由 [臺灣戶外攀岩協會（TOCC）固定點更新計畫](https://www.tocc-climbing.org/rebolting-project) 維護於 [Google Sheet](https://docs.google.com/spreadsheets/d/1QHFNQSPgKgQrTNnYn246wfotOYqOkzHjLltZ26keBgg/edit)，本專案每天自動同步。

> 資料僅供參考。岩壁與固定點狀況隨時可能改變，攀登前請自行檢查現場。

## 架構

```
Google Sheet（TOCC 固定點更新計畫編輯）
   │  scripts/import-sheet.ts：下載各區域分頁 CSV → 解析 → schema 驗證
   ▼
public/data/longdong.json（commit 進 repo，每次變動都有 diff 可查）
   │  vite build + vite-plugin-pwa
   ▼
靜態網站（GitHub Pages）
   │  Service Worker 預先快取 App 與完整資料
   ▼
手機：離線瀏覽、搜尋
```

- 沒有後端、沒有資料庫，只有靜態檔案。
- `.github/workflows/deploy.yml` 每天台灣時間 03:00 匯入一次；資料有變動才 commit。也可以在 Actions 頁面手動執行。
- 資料內容沒變時 `version` 和 `updatedAt` 不會改，不會產生多餘的 commit。

## 路線 ID

使用者的收藏與攀登紀錄以路線 ID 指向路線，**ID 發布後不可再改**。

- 路線：`<岩場>/<路線ID>`，例如 `longdong/7kq2mx`。「路線ID」是 Sheet 上的一欄，由 [Apps Script](apps-script/README.md) 自動產生，改名、改編號都不會變。
- 區域：`<岩場>/<區域>`，例如 `longdong/back-door`。
- Sheet 還沒有「路線ID」欄時，暫用路線編號產生（`longdong/523`），資料檔的 `idSource` 為 `legacy`。

匯入程式的防呆：缺 ID、ID 重複、已發布的 ID 消失，都會停止匯入，網站維持上一版資料。
確定要移除的路線，在 `scripts/retired-ids.ts` 登記其 ID。

## 個人資料

收藏與攀登紀錄只存在使用者瀏覽器的 IndexedDB（`src/personal/`），沒有帳號、不上傳。
每筆紀錄有唯一 ID、`updatedAt` 與刪除標記，匯入備份或日後同步雲端時以「較新者為準」合併。
使用者可在「我的紀錄」頁匯出 JSON 備份、匯入，或匯出 CSV。

## 開發

需要 Node.js 20 以上（CI 使用 `.nvmrc` 指定的 22）。

```bash
npm install
npm run dev          # 開發伺服器（Service Worker 只在 build 後啟用）
npm run import       # 從 Google Sheet 重新匯入資料
npm test             # 匯入程式的單元測試
npm run build        # 產出 dist/
npm run preview      # 預覽 build 結果，可測試離線
```

### 目錄

| 路徑 | 內容 |
|---|---|
| `scripts/sheet.config.ts` | Sheet ID 與各區域分頁的 gid |
| `scripts/lib/parse.ts` | Sheet 版面解析（說明見檔案開頭註解） |
| `scripts/lib/normalize.ts` | 文字正規化、日期、難度、狀態對照 |
| `src/data/schema.ts` | 資料格式（zod），匯入時驗證，前端共用型別 |
| `src/search.ts` | 本機全文搜尋（中文以單字＋雙字切詞） |
| `src/pages/` | 首頁、區域、路線、關於 |

### Sheet 版面變動時

匯入程式會在以下情況失敗或提出警告，排程就不會部署錯誤的資料：

- 分頁標題和 `sheet.config.ts` 的區域名稱對不上（gid 錯了）
- 找不到必要欄位（欄位被改名）
- 難度無法判讀、路線編號重複
- 輸出不符合 `src/data/schema.ts`

新增區域分頁時，在 `scripts/sheet.config.ts` 的 `AREA_TABS` 加上一筆。

## 部署

1. 在 GitHub repo 的 **Settings → Pages** 把 Source 設為 **GitHub Actions**。
2. push 到 `main` 就會 build 並部署。

網址用相對路徑、路由用 hash，所以放在 GitHub Pages 子路徑或自訂網域都可以。

## 授權

- 程式碼：[MIT](LICENSE)
- TOCC 標誌與由其產生的 App 圖示（`assets/`、`public/icons/`）：屬臺灣戶外攀岩協會所有，不適用 MIT
- 路線資料（`public/data/`）：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，© 臺灣戶外攀岩協會（TOCC）固定點更新計畫
