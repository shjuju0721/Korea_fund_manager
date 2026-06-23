// GET /api/quote?symbols=005930.KS,000660.KS
// 여러 종목/지수의 현재 시세를 한 번에 반환한다.
import type { NextRequest } from "next/server"

import { getQuotes } from "@/lib/yahoo"

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
    const quotes = await getQuotes(symbols)
    return Response.json({ quotes })
  } catch {
    return Response.json({ error: "시세 조회에 실패했습니다." }, { status: 502 })
  }
}
