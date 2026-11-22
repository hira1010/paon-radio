// Muse Usage Widget (3 accounts, compact v3) for Scriptable
// パオン・レミ・懸賞、3つのClaudeアカウントの週間残量と特典（追加トークン）を
// 1つのウィジェットに表示します。特典は未使用（100%残り）でも常に出ます。
// 中サイズに確実に収まるよう、リセットと特典を1行にまとめました。
// データは各Claudeが GitHub (hira1010/paon-radio) の usage/account*.json に
// 公開したものを読みます。
// Scriptableで今のスクリプトにこのコードを丸ごと貼り替えるだけでOKです。

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
  {
    key: "account3",
    name: "懸賞",
    color: new Color("#34c759"), // 緑
    url: "https://raw.githubusercontent.com/hira1010/paon-radio/main/usage/account3.json",
  },
]

const BG = new Color("#17171c")
const SUB = new Color("#9a9aa3")
const TRACK = new Color("#3a3a42")
const GOLD = new Color("#f0b429")

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
  const w = 296, h = 5
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
  return `Resets in ${days}日・${fmtDate(data.resets_at)}`
}

// ---------- 特典（追加トークン） ----------
// 未使用（0% used / 100% left）でも常に表示します。
// 特典データが無いアカウントだけ省略します。
function bonusText(data) {
  if (!data) return null
  if (typeof data.bonus_left_percent !== "number") return null
  let oku = null
  if (typeof data.bonus_tokens_left_oku === "number") oku = data.bonus_tokens_left_oku
  else if (typeof data.bonus_tokens_left_billion === "number") oku = Math.round(data.bonus_tokens_left_billion * 10)
  if (oku === null) return null
  return `✦特典 残り${oku}億トークン ${data.bonus_left_percent}%`
}

// ---------- ウィジェット組み立て ----------
async function buildWidget() {
  const cache = loadCache()
  const results = []
  for (const a of ACCOUNTS) results.push(await fetchAccount(a, cache))
  saveCache(cache)

  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(8, 14, 6, 14)

  results.forEach((data, i) => {
    const a = ACCOUNTS[i]
    if (i > 0) w.addSpacer(6)

    const row = w.addStack()
    row.centerAlignContent()
    const dot = row.addText("●")
    dot.textColor = a.color
    dot.font = Font.systemFont(7)
    row.addSpacer(4)
    const name = row.addText(a.name)
    name.textColor = Color.white()
    name.font = Font.semiboldSystemFont(11)
    row.addSpacer(5)
    const weekly = row.addText("Weekly")
    weekly.textColor = SUB
    weekly.font = Font.systemFont(9)
    row.addSpacer()

    if (data) {
      const left = row.addText(`${data.weekly_left_percent}% left`)
      left.textColor = Color.white()
      left.font = Font.boldSystemFont(14)
      w.addSpacer(1)
      const bar = w.addImage(barImage(data.weekly_left_percent, a.color))
      bar.imageSize = new Size(296, 5)
      w.addSpacer(2)

      // リセット（左・グレー）と特典（右・金）を1行に
      const sub = w.addStack()
      sub.centerAlignContent()
      const rs = sub.addText(resetsText(data))
      rs.textColor = SUB
      rs.font = Font.systemFont(8)
      const bt = bonusText(data)
      if (bt) {
        sub.addSpacer()
        const b = sub.addText(bt)
        b.textColor = GOLD
        b.font = Font.boldSystemFont(9)
      }
    } else {
      const wait = row.addText("設定待ち")
      wait.textColor = SUB
      wait.font = Font.semiboldSystemFont(11)
      w.addSpacer(2)
      const sub = w.addText(`${a.name}側のClaudeで公開設定が必要です`)
      sub.textColor = SUB
      sub.font = Font.systemFont(8)
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
