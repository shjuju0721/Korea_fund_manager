// GET /api/sparks?symbols=005930.KS,000660.KS&range=1mo
// 여러 종목의 추세선(작은 차트)용 종가 시계열을 한 번에 반환한다.
import type { NextRequest } from "next/server"

import type { ChartPoint } from "@/lib/types"
import { getChart } from "@/lib/yahoo"

export const dynamic = "force-dynamic"

const INTERVAL: Record<string, string> = {
  "5d": "1h",
  "1mo": "1d",
  "3mo": "1d",
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const param = sp.get("symbols")
  const range = sp.get("range") ?? "1mo"
  if (!param) {
    return Response.json({ error: "symbols 파라미터가 필요합니다." }, { status: 400 })
  }
  const symbols = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60)
  const interval = INTERVAL[range] ?? "1d"

  const settled = await Promise.allSettled(
    symbols.map((s) => getChart(s, range, interval)),
  )
  const sparks: Record<string, ChartPoint[]> = {}
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      sparks[symbols[i]] = r.value.points
    }
  })
  return Response.json({ sparks })
}
