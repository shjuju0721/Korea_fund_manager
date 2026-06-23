// GET /api/chart?symbol=005930.KS&range=1mo
// 한 종목/지수의 차트 시계열을 반환한다.
import type { NextRequest } from "next/server"

import { getChart } from "@/lib/yahoo"

export const dynamic = "force-dynamic"

// range -> Yahoo interval 매핑 (점 개수가 적당하도록 선택)
const INTERVAL: Record<string, string> = {
  "1d": "5m",
  "5d": "30m",
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y": "1d",
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const symbol = sp.get("symbol")
  const range = sp.get("range") ?? "1mo"
  if (!symbol) {
    return Response.json({ error: "symbol 파라미터가 필요합니다." }, { status: 400 })
  }
  const interval = INTERVAL[range] ?? "1d"

  try {
    const chart = await getChart(symbol, range, interval)
    if (!chart) {
      return Response.json({ error: "차트 데이터를 찾을 수 없습니다." }, { status: 404 })
    }
    return Response.json(chart)
  } catch {
    return Response.json({ error: "차트 조회에 실패했습니다." }, { status: 502 })
  }
}
