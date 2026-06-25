// GET /api/historical-price?symbol=005930.KS&date=2024-01-15
// 특정 날짜(휴장일이면 직전 거래일)의 종가를 반환한다.
// 예전에 산 종목을 "그때 가격"으로 내 투자에 추가할 때 사용한다.
import type { NextRequest } from "next/server"

import { getCloseOnDate } from "@/lib/naver-chart"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const symbol = sp.get("symbol")
  const date = sp.get("date")
  if (!symbol || !date) {
    return Response.json(
      { error: "symbol, date 파라미터가 필요합니다." },
      { status: 400 },
    )
  }

  try {
    const result = await getCloseOnDate(symbol, date)
    if (!result) {
      return Response.json(
        { error: "해당 날짜의 가격을 찾을 수 없습니다." },
        { status: 404 },
      )
    }
    return Response.json(result)
  } catch {
    return Response.json({ error: "과거 가격 조회에 실패했습니다." }, { status: 502 })
  }
}
