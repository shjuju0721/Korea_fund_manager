// 종목 검색 점수 계산(순수 함수). 서버/클라이언트 어디서나 쓸 수 있으며,
// 큰 데이터를 import 하지 않는다(검색 대상 목록은 호출자가 넘긴다).

export type SlimStock = {
  code: string
  name: string
  market: "KOSPI" | "KOSDAQ"
}

export type SearchHit = {
  symbol: string
  name: string
  code: string
  market: "KOSPI" | "KOSDAQ"
}

/** 6자리 코드 + 시장으로 Yahoo Finance 심볼 생성 (코스피 .KS / 코스닥 .KQ) */
export function toSymbol(code: string, market: string): string {
  return `${code}.${market === "KOSDAQ" ? "KQ" : "KS"}`
}

/** 종목명 또는 코드로 검색. 관련도 순으로 정렬해 상위 limit 개 반환. */
export function rankStocks(
  list: SlimStock[],
  query: string,
  limit = 12,
): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const isCode = /^\d+$/.test(q)

  const scored: { s: SlimStock; score: number }[] = []
  for (const s of list) {
    const name = s.name.toLowerCase()
    let score = -1
    if (isCode) {
      if (s.code === q) score = 100
      else if (s.code.startsWith(q)) score = 80
      else if (s.code.includes(q)) score = 40
    } else {
      if (name === q) score = 100
      else if (name.startsWith(q)) score = 80
      else if (name.includes(q)) score = 60
      else if (s.code.includes(q)) score = 20
    }
    if (score >= 0) {
      // 짧은 이름일수록(=질의와 더 근접) 약간 가산
      scored.push({ s, score: score - s.name.length * 0.05 })
    }
  }

  scored.sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name, "ko"))
  return scored.slice(0, limit).map(({ s }) => ({
    symbol: toSymbol(s.code, s.market),
    name: s.name,
    code: s.code,
    market: s.market,
  }))
}
