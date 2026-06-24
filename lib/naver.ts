// 네이버 금융 비공식 폴링 API로 한국 주식/지수의 (거의) 실시간 시세를 가져온다.
// 증권 앱/네이버 증권에 보이는 시세와 거의 동일하며, Yahoo(15~20분 지연)보다 훨씬 빠르다.
// 브라우저에서 직접 호출하면 CORS 로 막히므로 반드시 서버(Route Handler)에서만 호출한다.
//
// 주의: 비공식 API 이므로 응답 형식이 예고 없이 바뀔 수 있다. 그 경우를 대비해
// quote 라우트에서 실패 시 Yahoo 로 폴백한다.
import type { Quote } from "@/lib/types"
import { findMeta } from "@/lib/stocks"

const STOCK_URL = "https://polling.finance.naver.com/api/realtime/domestic/stock/"
const INDEX_URL = "https://polling.finance.naver.com/api/realtime/domestic/index/"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

// 앱 내부 심볼(^KS11, ^KQ11) → 네이버 지수 식별자(KOSPI, KOSDAQ)
const INDEX_MAP: Record<string, string> = {
  "^KS11": "KOSPI",
  "^KQ11": "KOSDAQ",
}

type NaverDatum = {
  itemCode: string
  stockName?: string
  // 현재가(장중)·종가(장마감). 예: "333,750" / 지수는 "8,371.04"
  closePrice?: string
  // 전일 대비 절대값(부호 없음). 예: "23,750"
  compareToPreviousClosePrice?: string
  // 등락 구분 코드. 1 상한 / 2 상승 / 3 보합 / 4 하한 / 5 하락
  compareToPreviousPrice?: { code?: string }
  // 등락률(부호 없음). 예: "7.66"
  fluctuationsRatio?: string
}

// "333,750" / "8,371.04" → 333750 / 8371.04
function num(s?: string): number {
  if (!s) return 0
  const n = Number(s.replace(/,/g, "").trim())
  return Number.isFinite(n) ? n : 0
}

// 등락 부호: 1 상한·2 상승 → +, 4 하한·5 하락 → -, 3 보합 → 0
function sign(code?: string): number {
  if (code === "1" || code === "2") return 1
  if (code === "4" || code === "5") return -1
  return 0
}

async function fetchData(url: string): Promise<NaverDatum[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = (await res.json()) as { datas?: NaverDatum[] }
  return json.datas ?? []
}

function toQuote(d: NaverDatum, appSymbol: string): Quote {
  const price = num(d.closePrice)
  const s = sign(d.compareToPreviousPrice?.code)
  const change = num(d.compareToPreviousClosePrice) * s
  const changePercent = num(d.fluctuationsRatio) * s
  return {
    symbol: appSymbol,
    name: findMeta(appSymbol)?.name ?? d.stockName ?? appSymbol,
    price,
    previousClose: price - change,
    change,
    changePercent,
    currency: "KRW",
  }
}

/**
 * 여러 심볼의 실시간 시세 조회.
 * 입력은 앱에서 쓰는 심볼(예: "005930.KS", "^KS11"), 반환 Quote.symbol 도 동일 심볼.
 */
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  // 지수와 종목을 분리한다(엔드포인트가 다름).
  const stockCodeToSymbol = new Map<string, string>() // "005930" -> "005930.KS"
  const indexNaverToSymbol = new Map<string, string>() // "KOSPI"  -> "^KS11"
  for (const s of symbols) {
    if (INDEX_MAP[s]) {
      indexNaverToSymbol.set(INDEX_MAP[s], s)
    } else {
      const code = s.split(".")[0]
      if (code) stockCodeToSymbol.set(code, s)
    }
  }

  const out: Quote[] = []

  // 종목: 콤마로 묶어 한 요청에 여러 개 조회(안전하게 50개씩 끊는다).
  const stockCodes = [...stockCodeToSymbol.keys()]
  const indexIds = [...indexNaverToSymbol.keys()]

  const jobs: Promise<NaverDatum[]>[] = []
  const kinds: ("stock" | "index")[] = []
  for (let i = 0; i < stockCodes.length; i += 50) {
    jobs.push(fetchData(STOCK_URL + stockCodes.slice(i, i + 50).join(",")))
    kinds.push("stock")
  }
  if (indexIds.length) {
    jobs.push(fetchData(INDEX_URL + indexIds.join(",")))
    kinds.push("index")
  }

  const results = await Promise.allSettled(jobs)
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return
    for (const d of r.value) {
      const sym =
        kinds[i] === "index"
          ? indexNaverToSymbol.get(d.itemCode)
          : stockCodeToSymbol.get(d.itemCode)
      if (sym) out.push(toQuote(d, sym))
    }
  })

  return out
}
