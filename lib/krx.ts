// KRX 상장법인 전체 목록(업종/주요제품 포함)을 다루는 서버 사이드 헬퍼.
// 데이터는 scripts/gen-krx.mjs 로 생성한 lib/krx-stocks.json 을 사용한다.
// AI 설명(/api/explain)의 grounding(정확한 업종·주요제품 주입)에만 쓰인다.
// (종목 검색은 클라이언트에서 public/stocks.json 으로 즉시 처리한다.)
import raw from "@/lib/krx-stocks.json"

export type KrxStock = {
  code: string
  name: string
  market: "KOSPI" | "KOSDAQ"
  sector: string
  products: string
}

const byCode = new Map((raw as KrxStock[]).map((s) => [s.code, s]))

/** 6자리 종목코드로 상장사 정보 조회 */
export function getByCode(code: string): KrxStock | undefined {
  return byCode.get(code)
}
