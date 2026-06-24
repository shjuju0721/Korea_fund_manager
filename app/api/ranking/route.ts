// GET /api/ranking?sort=marketValue&limit=100
// 시장 전체 순위 목록(현재는 시가총액 상위)을 실시간 시세와 함께 반환한다.
import type { NextRequest } from "next/server"

import { getMarketCapTop } from "@/lib/naver-ranking"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 100, 1), 100)

  try {
    const items = await getMarketCapTop(limit)
    return Response.json({ items })
  } catch {
    return Response.json({ error: "순위 조회에 실패했습니다." }, { status: 502 })
  }
}
