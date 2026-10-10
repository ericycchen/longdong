/**
 * 龍洞路線資料庫：自動產生「路線ID」
 *
 * 貼到 Google Sheet 的「擴充功能 → Apps Script」使用，安裝步驟見 apps-script/README.md。
 *
 * - 每條路線一個固定不變的 ID（6 碼隨機短碼，例如 7kq2mx），App 用它記錄使用者的收藏與攀登紀錄。
 * - ID 一旦產生就不會再改；之後改路線名稱、改編號，ID 都不受影響。
 * - 選單「路線ID → 補上缺少的 ID」：替所有還沒有 ID 的路線產生 ID。
 * - 編輯路線編號或名稱時，若該路線還沒有 ID，自動產生。
 *
 * 請勿手動修改或清除已經有的 ID。
 */

var ID_HEADER = '路線ID'
var HEADER_FIRST_CELL = '分區'
// 不含容易看錯的 0/o、1/l/i
var ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
var ID_LENGTH = 6
var ROUTE_NUMBER = /^#?\s*\d+(\.\d+)?$/
// 分頁下方的材質圖例與統計表，讀到這裡就停止
var LEGEND = /^(\d{3}|Ti)-[A-Za-z0-9]+$|^統計$/

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('路線ID')
    .addItem('補上缺少的 ID', 'fillMissingIds')
    .addToUi()
}

/** 選單功能：所有區域分頁中，沒有 ID 的路線都補上 */
function fillMissingIds() {
  var lock = LockService.getDocumentLock()
  lock.waitLock(30000)
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
    var used = collectExistingIds(ss)
    var added = 0
    var sheets = ss.getSheets()
    for (var i = 0; i < sheets.length; i++) {
      var layout = readLayout(sheets[i], true)
      if (!layout) continue
      added += fillSheet(sheets[i], layout, used, null)
    }
    SpreadsheetApp.getUi().alert('已補上 ' + added + ' 條路線的 ID。')
  } finally {
    lock.releaseLock()
  }
}

/** 編輯路線編號或名稱時，替還沒有 ID 的路線自動補上 */
function onEdit(e) {
  var sheet = e.range.getSheet()
  var layout = readLayout(sheet, false)
  if (!layout) return
  var firstCol = e.range.getColumn()
  var lastCol = firstCol + e.range.getNumColumns() - 1
  if (lastCol < Math.min(layout.numberCol, layout.nameCol) || firstCol > Math.max(layout.numberCol, layout.nameCol)) return
  var lock = LockService.getDocumentLock()
  if (!lock.tryLock(10000)) return
  try {
    var used = collectExistingIds(sheet.getParent())
    fillSheet(sheet, layout, used, { from: e.range.getRow(), to: e.range.getLastRow() })
  } finally {
    lock.releaseLock()
  }
}

/* ---------- 內部 ---------- */

/**
 * 找出欄位位置（1 起算）。不是區域分頁則回傳 null。
 * createIdColumn 為 true 時，若沒有「路線ID」欄，加在最右邊（不會移動既有欄位）。
 */
function readLayout(sheet, createIdColumn) {
  var top = sheet.getRange(1, 1, Math.min(5, sheet.getMaxRows()), sheet.getLastColumn()).getDisplayValues()
  for (var r = 0; r < top.length; r++) {
    if (String(top[r][0]).trim() !== HEADER_FIRST_CELL) continue
    var header = top[r].map(function (h) {
      return String(h).trim()
    })
    var numberCol = header.indexOf('路線編號') + 1
    var nameCol = header.indexOf('路線名稱') + 1
    if (!numberCol || !nameCol) return null
    var idCol = header.indexOf(ID_HEADER) + 1
    if (!idCol) {
      if (!createIdColumn) return null
      idCol = sheet.getLastColumn() + 1
      if (idCol > sheet.getMaxColumns()) sheet.insertColumnAfter(sheet.getMaxColumns())
      sheet.getRange(r + 1, idCol).setValue(ID_HEADER).setFontWeight('bold')
    }
    return { headerRow: r + 1, numberCol: numberCol, nameCol: nameCol, idCol: idCol }
  }
  return null
}

/** 補上一個分頁中缺少的 ID；rows 指定只處理某些列（null 為全部）。回傳補上的數量 */
function fillSheet(sheet, layout, used, rows) {
  var start = layout.headerRow + 1
  var count = sheet.getLastRow() - layout.headerRow
  if (count <= 0) return 0
  var numbers = sheet.getRange(start, layout.numberCol, count, 1).getDisplayValues()
  var names = sheet.getRange(start, layout.nameCol, count, 1).getDisplayValues()
  var idRange = sheet.getRange(start, layout.idCol, count, 1)
  var ids = idRange.getDisplayValues()
  var added = 0
  for (var i = 0; i < count; i++) {
    var no = String(numbers[i][0]).trim()
    if (LEGEND.test(no)) break
    var row = start + i
    if (rows && (row < rows.from || row > rows.to)) continue
    if (!isRouteRow(no, names[i][0]) || String(ids[i][0]).trim()) continue
    ids[i][0] = newUniqueId(used)
    added++
  }
  if (added) idRange.setValues(ids)
  return added
}

function isRouteRow(number, name) {
  return ROUTE_NUMBER.test(String(number).trim()) && String(name).trim() !== ''
}

function collectExistingIds(ss) {
  var used = {}
  var sheets = ss.getSheets()
  for (var i = 0; i < sheets.length; i++) {
    var layout = readLayout(sheets[i], false)
    if (!layout) continue
    var count = sheets[i].getLastRow() - layout.headerRow
    if (count <= 0) continue
    var values = sheets[i].getRange(layout.headerRow + 1, layout.idCol, count, 1).getDisplayValues()
    for (var r = 0; r < values.length; r++) {
      var id = String(values[r][0]).trim()
      if (id) used[id] = true
    }
  }
  return used
}

function newUniqueId(used) {
  for (var attempt = 0; attempt < 100; attempt++) {
    var id = randomId()
    if (!used[id]) {
      used[id] = true
      return id
    }
  }
  throw new Error('無法產生不重複的 ID')
}

function randomId() {
  var s = ''
  for (var i = 0; i < ID_LENGTH; i++) s += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
  return s
}

// 讓單元測試可以載入（Apps Script 環境沒有 module，這段不會執行）
if (typeof module !== 'undefined') {
  module.exports = { randomId: randomId, newUniqueId: newUniqueId, isRouteRow: isRouteRow, ALPHABET: ALPHABET, ID_LENGTH: ID_LENGTH }
}
