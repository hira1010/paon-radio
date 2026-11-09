// Muse Usage Widget (2 accounts) for Scriptable
// パオンとレミ、2つのMuseアカウントの週間残量を1つのウィジェットに表示します。
// データは各Museが GitHub (hira1010/paon-radio) の usage/account*.json に公開したものを読みます。
// Scriptableで新しいスクリプトを作り、このコードを丸ごと貼るだけでOKです。

const ACCOUNTS = [
  {
    key: "account1",
    name: "パオン",
    color: new Color("#8b7cf6"), // 紫
    url: "https://raw.githubusercontent.com/hira1010/paon-radio/main/usage/account1.json",
  },
  {
    key: "account2",
    name: "レミ",
    color: new Color("#f28bb4"), // ピンク
    url: "https://raw.githubusercontent.com/hira1010/paon-radio/main/usage/account2.json",
  },
]

const BG = new Color("#17171c")
const SUB = new Color("#9a9aa3")
const TRACK = new Color("#3a3a42")

// ---------- データ取得（失敗したら前回のキャッシュを使う） ----------
const fm = FileManager.local()
const cachePath = fm.joinPath(fm.documentsDirectory(), "muse-usage-cache.json")

function loadCache() {
  try {
    if (fm.fileExists(cachePath)) return JSON.parse(fm.readString(cachePath))
  } catch (e) {}
  return {}
}
function saveCache(c) {
  try { fm.writeString(cachePath, JSON.stringify(c)) } catch (e) {}
}

async function fetchAccount(a, cache) {
  try {
    const req = new Request(a.url)
    req.timeoutInterval = 15
    const data = await req.loadJSON()
    if (data && typeof data.weekly_left_percent === "number") {
      cache[a.key] = data
      return data
    }
  } catch (e) {}
  return cache[a.key] || null
}

// ---------- バー画像 ----------
function barImage(percent, color) {
  const w = 220, h = 7
  const ctx = new DrawContext()
  ctx.size = new Size(w, h)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const trackPath = new Path()
  trackPath.addRoundedRect(new Rect(0, 0, w, h), h / 2, h / 2)
  ctx.addPath(trackPath)
  ctx.setFillColor(TRACK)
  ctx.fillPath()
  const fw = Math.max(h, Math.round(w * Math.min(100, Math.max(0, percent)) / 100))
  const fillPath = new Path()
  fillPath.addRoundedRect(new Rect(0, 0, fw, h), h / 2, h / 2)
  ctx.addPath(fillPath)
  ctx.setFillColor(color)
  ctx.fillPath()
  return ctx.getImage()
}

// ---------- 日付 ----------
function fmtDate(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const df = new DateFormatter()
  df.locale = "ja_JP"
  df.dateFormat = "M/d HH:mm"
  return df.string(d)
}
function resetsText(data) {
  if (!data || !data.resets_at) return ""
  const ms = new Date(data.resets_at).getTime() - Date.now()
  const days = Math.max(0, Math.ceil(ms / 86400000))
  return `Resets in ${days}日 ・ ${fmtDate(data.resets_at)}`
}
function updatedText(data) {
  if (!data || !data.updated_at) return ""
  return fmtDate(data.updated_at)
}

// ---------- ウィジェット組み立て ----------
async function buildWidget() {
  const cache = loadCache()
  const results = []
  for (const a of ACCOUNTS) results.push(await fetchAccount(a, cache))
  saveCache(cache)

  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(14, 16, 12, 16)

  const head = w.addStack()
  head.centerAlignContent()
  const spark = head.addText("✦")
  spark.textColor = new Color("#8b7cf6")
  spark.font = Font.boldSystemFont(13)
  head.addSpacer(5)
  const title = head.addText("Muse")
  title.textColor = Color.white()
  title.font = Font.boldSystemFont(13)
  head.addSpacer()
  const latest = results.map(updatedText).filter(Boolean).sort().pop()
  if (latest) {
    const up = head.addText("Updated " + latest)
    up.textColor = SUB
    up.font = Font.systemFont(9)
  }

  results.forEach((data, i) => {
    const a = ACCOUNTS[i]
    w.addSpacer(i === 0 ? 10 : 12)

    const row = w.addStack()
    row.centerAlignContent()
    const dot = row.addText("●")
    dot.textColor = a.color
    dot.font = Font.systemFont(8)
    row.addSpacer(5)
    const name = row.addText(a.name)
    name.textColor = Color.white()
    name.font = Font.semiboldSystemFont(12)
    row.addSpacer(6)
    const weekly = row.addText("Weekly")
    weekly.textColor = SUB
    weekly.font = Font.systemFont(10)
    row.addSpacer()

    if (data) {
      const left = row.addText(`${data.weekly_left_percent}% left`)
      left.textColor = Color.white()
      left.font = Font.boldSystemFont(16)
      w.addSpacer(4)
      const bar = w.addImage(barImage(data.weekly_left_percent, a.color))
      bar.imageSize = new Size(220, 7)
      w.addSpacer(3)
      const sub = w.addText(resetsText(data))
      sub.textColor = SUB
      sub.font = Font.systemFont(9)
    } else {
      const wait = row.addText("設定待ち")
      wait.textColor = SUB
      wait.font = Font.semiboldSystemFont(12)
      w.addSpacer(3)
      const sub = w.addText(`${a.name}側のMuseで公開設定が必要です`)
      sub.textColor = SUB
      sub.font = Font.systemFont(9)
    }
  })

  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
  return w
}

const widget = await buildWidget()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
