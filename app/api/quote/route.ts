// GET /api/quote?symbols=005930.KS,000660.KS
// 여러 종목/지수의 현재 시세를 한 번에 반환한다.
//
// 시세는 네이버 금융 비공식 API(거의 실시간)를 우선 사용하고,
// 실패하거나 일부 종목이 빠지면 Yahoo Finance(지연)로 폴백/보강한다.
import type { NextRequest } from "next/server"

import type { Quote } from "@/lib/types"
import { getQuotes as getNaverQuotes } from "@/lib/naver"
import { getQuotes as getYahooQuotes } from "@/lib/yahoo"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("symbols")
  if (!param) {
    return Response.json({ error: "symbols 파라미터가 필요합니다." }, { status: 400 })
  }
  const symbols = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60)

  try {
    // 1) 네이버(실시간) 우선
    let quotes: Quote[] = []
    try {
      quotes = await getNaverQuotes(symbols)
    } catch {
      quotes = []
    }

    // 2) 네이버에서 빠진 심볼만 Yahoo 로 보강(완전 실패 시 전체 폴백 효과).
    const have = new Set(quotes.map((q) => q.symbol))
    const missing = symbols.filter((s) => !have.has(s))
    if (missing.length > 0) {
      try {
        quotes = quotes.concat(await getYahooQuotes(missing))
      } catch {
        // Yahoo 도 실패하면 가진 만큼만 반환
      }
    }

    return Response.json({ quotes })
  } catch {
    return Response.json({ error: "시세 조회에 실패했습니다." }, { status: 502 })
  }
}
