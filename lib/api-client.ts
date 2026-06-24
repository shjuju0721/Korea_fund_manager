// 브라우저에서 우리 자신의 Route Handler(/api/*)를 호출하는 래퍼.
// 같은 오리진이라 CORS 문제가 없다.
"use client"

import type { ChartPoint, ChartResponse, NewsItem, Quote, RankItem } from "@/lib/types"

export async function fetchMarketCapTop(limit = 100): Promise<RankItem[]> {
  const res = await fetch(`/api/ranking?sort=marketValue&limit=${limit}`)
  if (!res.ok) throw new Error("시총 순위 조회 실패")
  const data = (await res.json()) as { items: RankItem[] }
  return data.items
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return []
  const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(","))}`)
  if (!res.ok) throw new Error("시세 조회 실패")
  const data = (await res.json()) as { quotes: Quote[] }
  return data.quotes
}

export async function fetchChart(
  symbol: string,
  range = "1mo",
): Promise<ChartResponse> {
  const res = await fetch(
    `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`,
  )
  if (!res.ok) throw new Error("차트 조회 실패")
  return (await res.json()) as ChartResponse
}

export async function fetchSparks(
  symbols: string[],
  range = "1mo",
): Promise<Record<string, ChartPoint[]>> {
  if (symbols.length === 0) return {}
  const res = await fetch(
    `/api/sparks?symbols=${encodeURIComponent(symbols.join(","))}&range=${range}`,
  )
  if (!res.ok) throw new Error("추세선 조회 실패")
  const data = (await res.json()) as { sparks: Record<string, ChartPoint[]> }
  return data.sparks
}

export async function fetchNews(q: string, limit = 10): Promise<NewsItem[]> {
  const res = await fetch(`/api/news?q=${encodeURIComponent(q)}&limit=${limit}`)
  if (!res.ok) throw new Error("뉴스 조회 실패")
  const data = (await res.json()) as { items: NewsItem[] }
  return data.items
}

import type { SlimStock } from "@/lib/stock-search"

// 코스피/코스닥 전체 상장사 슬림 목록(/stocks.json)을 한 번만 내려받아 캐시한다.
// 이후 검색은 브라우저 메모리에서 즉시 수행되므로 네트워크 왕복이 없다.
let indexPromise: Promise<SlimStock[]> | null = null
export function loadStockIndex(): Promise<SlimStock[]> {
  if (!indexPromise) {
    indexPromise = fetch("/stocks.json")
      .then((res) => {
        if (!res.ok) throw new Error("종목 목록 로드 실패")
        return res.json() as Promise<SlimStock[]>
      })
      .catch((e) => {
        indexPromise = null // 실패 시 다음 시도에서 재로드 가능하게
        throw e
      })
  }
  return indexPromise
}

// AI(Gemini) 가 생성한 종목/지수 설명을 우리 서버(/api/explain)에서 받아온다.
// 실제 Gemini 호출과 API 키 사용은 모두 서버에서만 이뤄진다.
export async function fetchExplain(
  name: string,
  opts: { isIndex?: boolean; code?: string } = {},
): Promise<string> {
  const params = new URLSearchParams({ name, isIndex: opts.isIndex ? "1" : "0" })
  if (opts.code) params.set("code", opts.code)
  const res = await fetch(`/api/explain?${params.toString()}`)
  const data = (await res.json().catch(() => ({}))) as {
    text?: string
    error?: string
  }
  if (!res.ok || !data.text) {
    throw new Error(data.error || "AI 설명 조회 실패")
  }
  return data.text
}
