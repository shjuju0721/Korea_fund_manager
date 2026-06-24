// GET /api/sparks?symbols=005930.KS,000660.KS&range=1mo
// 여러 종목의 추세선(작은 차트)용 종가 시계열을 한 번에 반환한다.
// 네이버 금융 일봉을 사용한다(실패한 종목은 추세선만 비고 나머지는 정상 표시).
import type { NextRequest } from "next/server"

import type { ChartPoint } from "@/lib/types"
import { getDailyPoints } from "@/lib/naver-chart"

export const dynamic = "force-dynamic"

// range -> 일봉 개수 (추세선 길이)
const COUNT: Record<string, number> = { "5d": 6, "1mo": 22, "3mo": 66 }

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
  const count = COUNT[range] ?? 22

  const settled = await Promise.allSettled(
    symbols.map((s) => getDailyPoints(s, count)),
  )
  const sparks: Record<string, ChartPoint[]> = {}
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length > 0) {
      sparks[symbols[i]] = r.value
    }
  })
  return Response.json({ sparks })
}
