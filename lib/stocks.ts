// 한국 주식 차트 앱에서 사용하는 종목/테마/지수 정의와 타입.
// 데이터는 Yahoo Finance (무료) 에서 가져오며, 한국 종목 심볼은
// 코스피 종목은 `.KS`, 코스닥 종목은 `.KQ` 접미사를 사용한다.

export type StockMeta = {
  /** Yahoo Finance 심볼 (예: 005930.KS) */
  symbol: string
  /** 한국어 종목명 */
  name: string
  /** 6자리 종목코드 */
  code: string
  /** 시장 구분 */
  market: "KOSPI" | "KOSDAQ"
}

export type ThemeGroup = {
  id: string
  /** 테마 이름 (예: 반도체주) */
  name: string
  /** 짧은 설명 */
  description: string
  /** 대표 이모지 */
  emoji: string
  stocks: StockMeta[]
}

export type IndexMeta = {
  symbol: string
  name: string
  shortName: string
}

/** 메인 화면에 띄울 시장 지수 (코스피 / 코스닥) */
export const INDICES: IndexMeta[] = [
  { symbol: "^KS11", name: "코스피", shortName: "KOSPI" },
  { symbol: "^KQ11", name: "코스닥", shortName: "KOSDAQ" },
]

/** 주식 테마별 분류 */
export const THEMES: ThemeGroup[] = [
  {
    id: "semiconductor",
    name: "반도체주",
    description: "메모리·파운드리·소재/장비",
    emoji: "💾",
    stocks: [
      { symbol: "005930.KS", name: "삼성전자", code: "005930", market: "KOSPI" },
      { symbol: "000660.KS", name: "SK하이닉스", code: "000660", market: "KOSPI" },
      { symbol: "042700.KS", name: "한미반도체", code: "042700", market: "KOSPI" },
      { symbol: "000990.KS", name: "DB하이텍", code: "000990", market: "KOSPI" },
      { symbol: "058470.KQ", name: "리노공업", code: "058470", market: "KOSDAQ" },
    ],
  },
  {
    id: "bio",
    name: "바이오주",
    description: "제약·바이오시밀러·신약",
    emoji: "🧬",
    stocks: [
      { symbol: "207940.KS", name: "삼성바이오로직스", code: "207940", market: "KOSPI" },
      { symbol: "068270.KS", name: "셀트리온", code: "068270", market: "KOSPI" },
      { symbol: "000100.KS", name: "유한양행", code: "000100", market: "KOSPI" },
      { symbol: "128940.KS", name: "한미약품", code: "128940", market: "KOSPI" },
      { symbol: "326030.KS", name: "SK바이오팜", code: "326030", market: "KOSPI" },
    ],
  },
  {
    id: "defense",
    name: "방산주",
    description: "항공우주·방위산업",
    emoji: "🛡️",
    stocks: [
      { symbol: "012450.KS", name: "한화에어로스페이스", code: "012450", market: "KOSPI" },
      { symbol: "047810.KS", name: "한국항공우주", code: "047810", market: "KOSPI" },
      { symbol: "079550.KS", name: "LIG넥스원", code: "079550", market: "KOSPI" },
      { symbol: "064350.KS", name: "현대로템", code: "064350", market: "KOSPI" },
      { symbol: "272210.KS", name: "한화시스템", code: "272210", market: "KOSPI" },
    ],
  },
  {
    id: "battery",
    name: "2차전지주",
    description: "배터리·양극재·소재",
    emoji: "🔋",
    stocks: [
      { symbol: "373220.KS", name: "LG에너지솔루션", code: "373220", market: "KOSPI" },
      { symbol: "006400.KS", name: "삼성SDI", code: "006400", market: "KOSPI" },
      { symbol: "003670.KS", name: "포스코퓨처엠", code: "003670", market: "KOSPI" },
      { symbol: "247540.KQ", name: "에코프로비엠", code: "247540", market: "KOSDAQ" },
      { symbol: "348370.KQ", name: "엔켐", code: "348370", market: "KOSDAQ" },
    ],
  },
  {
    id: "auto",
    name: "자동차주",
    description: "완성차·부품",
    emoji: "🚗",
    stocks: [
      { symbol: "005380.KS", name: "현대차", code: "005380", market: "KOSPI" },
      { symbol: "000270.KS", name: "기아", code: "000270", market: "KOSPI" },
      { symbol: "012330.KS", name: "현대모비스", code: "012330", market: "KOSPI" },
    ],
  },
  {
    id: "internet",
    name: "인터넷/IT주",
    description: "플랫폼·게임·인터넷",
    emoji: "🌐",
    stocks: [
      { symbol: "035420.KS", name: "NAVER", code: "035420", market: "KOSPI" },
      { symbol: "035720.KS", name: "카카오", code: "035720", market: "KOSPI" },
      { symbol: "036570.KS", name: "엔씨소프트", code: "036570", market: "KOSPI" },
      { symbol: "259960.KS", name: "크래프톤", code: "259960", market: "KOSPI" },
    ],
  },
]

/** 모든 종목을 평탄화한 배열 (심볼 -> 메타 조회에 사용) */
export const ALL_STOCKS: StockMeta[] = THEMES.flatMap((t) => t.stocks)

/** 종목코드로 메타 찾기 */
export function stockByCode(code: string): StockMeta | undefined {
  return ALL_STOCKS.find((s) => s.code === code)
}

/**
 * 실적 우량주 20선 (대표 대형/우량주). 시세는 실시간으로 채운다.
 * 모든 종목은 위 THEMES 안에 포함돼 있어 별도 시세 요청 없이 재사용된다.
 */
export const TOP_PICKS: StockMeta[] = [
  "005930", // 삼성전자
  "000660", // SK하이닉스
  "207940", // 삼성바이오로직스
  "005380", // 현대차
  "000270", // 기아
  "373220", // LG에너지솔루션
  "035420", // NAVER
  "068270", // 셀트리온
  "012450", // 한화에어로스페이스
  "006400", // 삼성SDI
  "003670", // 포스코퓨처엠
  "012330", // 현대모비스
  "259960", // 크래프톤
  "047810", // 한국항공우주
  "000100", // 유한양행
  "326030", // SK바이오팜
  "042700", // 한미반도체
  "058470", // 리노공업
  "079550", // LIG넥스원
  "064350", // 현대로템
]
  .map(stockByCode)
  .filter((s): s is StockMeta => Boolean(s))

/** 심볼로 종목 메타 찾기 (지수 포함) */
export function findMeta(symbol: string): { name: string; market?: string } | undefined {
  const idx = INDICES.find((i) => i.symbol === symbol)
  if (idx) return { name: idx.name }
  const s = ALL_STOCKS.find((x) => x.symbol === symbol)
  if (s) return { name: s.name, market: s.market }
  return undefined
}

/** 종목 코드 또는 심볼로 한국어 종목명 찾기 */
export function nameOf(symbolOrCode: string): string {
  const found = ALL_STOCKS.find(
    (s) => s.symbol === symbolOrCode || s.code === symbolOrCode,
  )
  return found?.name ?? symbolOrCode
}
