// 네이버 금융 차트 데이터(실시간 분봉 + 일봉)를 서버에서 가져온다.
//  - 1일      : 분봉(JSON API, 종목·지수 모두 지원, 거의 실시간)
//  - 5일      : 종목은 분봉(여러 날), 지수는 분봉 미지원이라 일봉으로 대체
//  - 1개월~1년: 일봉(fchart, 종목·지수 모두 지원)
// 브라우저에서 직접 호출하면 CORS 로 막히므로 반드시 서버(Route Handler)에서만 호출한다.
//
// 주의: 비공식 API 이므로 형식이 바뀔 수 있다. 실패 시 chart 라우트에서 Yahoo 로 폴백한다.
import type { ChartPoint, ChartResponse } from "@/lib/types"
import { findMeta } from "@/lib/stocks"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

// 앱 심볼(^KS11/^KQ11) → 네이버 지수 식별자
const INDEX_MAP: Record<string, string> = { "^KS11": "KOSPI", "^KQ11": "KOSDAQ" }

type Target = { kind: "item" | "index"; nv: string; isIndex: boolean }

function resolve(symbol: string): Target {
  const idx = INDEX_MAP[symbol]
  if (idx) return { kind: "index", nv: idx, isIndex: true }
  return { kind: "item", nv: symbol.split(".")[0], isIndex: false } // "005930.KS" → "005930"
}

// KST(UTC+9) 시각 문자열 → unix(초). 길이로 일/분/초 단위 자동 판별.
//  "20260624"(일) / "202606240900"(분) / "20260624090000"(분·초)
function kstToUnix(s: string): number {
  const y = +s.slice(0, 4)
  const mo = +s.slice(4, 6) - 1
  const d = +s.slice(6, 8)
  const H = s.length >= 12 ? +s.slice(8, 10) : 0
  const Mi = s.length >= 12 ? +s.slice(10, 12) : 0
  const Se = s.length >= 14 ? +s.slice(12, 14) : 0
  return Math.floor(Date.UTC(y, mo, d, H - 9, Mi, Se) / 1000) // KST=UTC+9 → 시간에서 9 차감
}

// unix(초) → KST 기준 "yyyymmdd"(거래일 구분용)
function dayKey(unix: number): string {
  const d = new Date((unix + 9 * 3600) * 1000)
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${d.getUTCFullYear()}${m}${day}`
}

async function getText(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" })
  return res.ok ? res.text() : null
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) return null
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

// 당일 분봉(JSON). 종목·지수 모두 동작하며 당일 장중 데이터를 반환한다.
type MinuteRow = { localDateTime: string; currentPrice: number }
async function jsonMinute(t: Target): Promise<ChartPoint[]> {
  const url = `https://api.stock.naver.com/chart/domestic/${t.kind}/${t.nv}/minute?count=400`
  const rows = await getJson<MinuteRow[]>(url)
  if (!rows) return []
  return rows
    .map((r) => ({ t: kstToUnix(r.localDateTime), close: Number(r.currentPrice) }))
    .filter((p) => Number.isFinite(p.close) && p.close > 0)
}

// fchart XML 파서. item data 형식: "날짜|시가|고가|저가|종가|거래량".
// (name 속성은 EUC-KR 로 깨져 있지만 사용하지 않으므로 디코딩 불필요 — 종가만 파싱)
function parseFchart(xml: string): ChartPoint[] {
  const out: ChartPoint[] = []
  const re = /data="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const parts = m[1].split("|")
    if (parts.length < 5) continue
    const close = Number(parts[4])
    if (!Number.isFinite(close) || close <= 0) continue
    out.push({ t: kstToUnix(parts[0]), close })
  }
  return out
}

async function fchart(
  sym: string,
  timeframe: "day" | "minute",
  count: number,
): Promise<ChartPoint[]> {
  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${encodeURIComponent(
    sym,
  )}&timeframe=${timeframe}&count=${count}&requestType=0`
  const xml = await getText(url)
  return xml ? parseFchart(xml) : []
}

const DAY_COUNT: Record<string, number> = { "1mo": 30, "3mo": 70, "6mo": 140, "1y": 260 }

// 1일 차트의 기준선용 전일(직전) 종가
async function prevClose(t: Target): Promise<number | undefined> {
  const pts = await fchart(t.nv, "day", 2)
  if (pts.length >= 2) return pts[pts.length - 2].close
  return pts[0]?.close
}

/** 한 종목/지수의 차트 시계열 (기간별). 입력/출력 심볼은 앱 심볼 그대로. */
export async function getChart(
  symbol: string,
  range: string,
): Promise<ChartResponse | null> {
  const t = resolve(symbol)
  let points: ChartPoint[] = []
  let previousClose: number | undefined

  if (range === "1d") {
    // 당일 실시간 분봉
    points = await jsonMinute(t)
    previousClose = await prevClose(t)
  } else if (range === "5d") {
    if (t.isIndex) {
      // 지수는 분봉 미지원 → 최근 영업일 일봉으로 대체
      points = await fchart(t.nv, "day", 7)
      previousClose = points[0]?.close
    } else {
      // 종목은 여러 날 분봉을 받아 최근 5거래일만 남긴다
      const all = await fchart(t.nv, "minute", 2000)
      const last5 = new Set([...new Set(all.map((p) => dayKey(p.t)))].slice(-5))
      points = all.filter((p) => last5.has(dayKey(p.t)))
      previousClose = points[0]?.close
    }
  } else {
    // 1개월~1년: 일봉
    points = await fchart(t.nv, "day", DAY_COUNT[range] ?? 30)
    previousClose = points[0]?.close
  }

  if (points.length === 0) return null
  return {
    symbol,
    name: findMeta(symbol)?.name ?? symbol,
    range,
    points,
    previousClose: previousClose ?? points[0].close,
  }
}

/** 스파크라인용 일봉 종가 시계열 (기본 약 1개월). */
export async function getDailyPoints(symbol: string, count = 22): Promise<ChartPoint[]> {
  return fchart(resolve(symbol).nv, "day", count)
}

/**
 * 특정 날짜의 종가. 주말·공휴일 등 휴장일이면 그 이전의 가장 가까운 거래일 종가를 쓴다.
 * (예전에 산 종목을 "그때 가격"으로 추가할 때 사용)
 * @param date "YYYY-MM-DD" (KST 기준)
 * @returns 실제 적용된 거래일("yyyymmdd")과 종가. 데이터가 없으면 null.
 */
export async function getCloseOnDate(
  symbol: string,
  date: string,
): Promise<{ date: string; close: number } | null> {
  const target = date.replace(/-/g, "") // "2024-01-15" → "20240115"
  if (!/^\d{8}$/.test(target)) return null

  // 오늘까지 며칠 전인지로 받아올 일봉 개수를 가늠한다(거래일 ≈ 달력일 × 5/7).
  // 휴장일 때문에 실제 거래일은 더 적으므로 이 추정치는 넉넉한 상한이라 안전하다.
  const targetUnix = kstToUnix(target)
  const calendarDays = Math.max(0, Math.round((Date.now() / 1000 - targetUnix) / 86400))
  const count = Math.min(4000, Math.ceil((calendarDays * 5) / 7) + 15)

  // fchart 일봉은 오래된→최근 순으로 정렬되어 있다.
  const pts = await fchart(resolve(symbol).nv, "day", count)
  if (pts.length === 0) return null

  // 타겟 이하(=그날 또는 그 이전)의 가장 늦은 거래일을 찾는다.
  let chosen: ChartPoint | undefined
  for (const p of pts) {
    if (dayKey(p.t) <= target) chosen = p
    else break
  }
  const point = chosen ?? pts[0] // 데이터 시작보다 더 옛날이면 가장 오래된 거래일로 대체
  return { date: dayKey(point.t), close: point.close }
}
