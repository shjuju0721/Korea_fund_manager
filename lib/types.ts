// 클라이언트와 서버(Route Handler)가 공유하는 API 응답 타입.

/** 한 종목/지수의 현재 시세 */
export type Quote = {
  symbol: string
  name: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  marketState?: string
}

/** 차트의 한 점 */
export type ChartPoint = {
  t: number // unix timestamp(초)
  close: number
}

/** 차트 응답 */
export type ChartResponse = {
  symbol: string
  name: string
  range: string
  points: ChartPoint[]
  previousClose: number
}

/** 뉴스 1건 */
export type NewsItem = {
  title: string
  link: string
  source: string
  pubDate: string // ISO 문자열
}
