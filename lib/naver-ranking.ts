// 네이버 금융 순위 API로 시장 전체 순위(시가총액 등)를 서버에서 가져온다.
// 종목 하나하나를 조회하지 않고도 코스피+코스닥 전체 상위 종목을 효율적으로 받는다.
// 브라우저에서 직접 호출하면 CORS 로 막히므로 반드시 서버(Route Handler)에서만 호출한다.
import type { RankItem } from "@/lib/types"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

type RankRow = {
  itemCode: string
  stockName: string
  closePrice?: string
  compareToPreviousClosePrice?: string
  compareToPreviousPrice?: { code?: string }
  fluctuationsRatio?: string
  marketValue?: string
  marketValueHangeul?: string
}

// "19,628,880" → 19628880
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

async function fetchList(
  category: "KOSPI" | "KOSDAQ",
  sort: string,
  pageSize: number,
): Promise<RankRow[]> {
  const url = `https://m.stock.naver.com/api/stocks/${sort}/${category}?page=1&pageSize=${pageSize}`
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = (await res.json()) as { stocks?: RankRow[] }
  return json.stocks ?? []
}

function toItem(r: RankRow, market: "KOSPI" | "KOSDAQ"): RankItem {
  const price = num(r.closePrice)
  const s = sign(r.compareToPreviousPrice?.code)
  return {
    symbol: `${r.itemCode}.${market === "KOSDAQ" ? "KQ" : "KS"}`,
    code: r.itemCode,
    market,
    name: r.stockName,
    price,
    change: num(r.compareToPreviousClosePrice) * s,
    changePercent: num(r.fluctuationsRatio) * s,
    marketValue: num(r.marketValue),
    marketValueText: r.marketValueHangeul ?? "",
  }
}

/**
 * 시가총액 상위 종목 (코스피+코스닥 통합 정렬).
 * 두 시장에서 각각 받아 합친 뒤 시총 내림차순으로 limit 개 반환.
 */
export async function getMarketCapTop(limit = 100): Promise<RankItem[]> {
  const pageSize = Math.min(Math.max(limit, 10), 100)
  const [kospi, kosdaq] = await Promise.all([
    fetchList("KOSPI", "marketValue", pageSize),
    fetchList("KOSDAQ", "marketValue", pageSize),
  ])
  const items = [
    ...kospi.map((r) => toItem(r, "KOSPI")),
    ...kosdaq.map((r) => toItem(r, "KOSDAQ")),
  ]
  items.sort((a, b) => b.marketValue - a.marketValue)
  return items.slice(0, limit)
}
