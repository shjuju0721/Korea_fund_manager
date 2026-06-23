// Yahoo Finance 무료 차트 API 를 서버에서 호출하는 헬퍼.
// 브라우저에서 직접 호출하면 CORS 로 막히므로 Route Handler 를 통해 프록시한다.
import type { ChartResponse, Quote } from "@/lib/types"
import { findMeta } from "@/lib/stocks"

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

type YahooMeta = {
  symbol: string
  currency?: string
  regularMarketPrice?: number
  chartPreviousClose?: number
  previousClose?: number
  longName?: string
  shortName?: string
}

type YahooResult = {
  meta: YahooMeta
  timestamp?: number[]
  indicators?: { quote?: { close?: (number | null)[] }[] }
}

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<YahooResult | null> {
  const url = `${BASE}/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}&includePrePost=false`
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    chart?: { result?: YahooResult[]; error?: unknown }
  }
  return json.chart?.result?.[0] ?? null
}

/** 단일 심볼의 현재 시세 */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const result = await fetchChart(symbol, "1d", "1d")
  if (!result) return null
  const m = result.meta
  const price = m.regularMarketPrice ?? 0
  const prev = m.chartPreviousClose ?? m.previousClose ?? price
  const change = price - prev
  const localName = findMeta(symbol)?.name
  return {
    symbol,
    name: localName ?? m.longName ?? m.shortName ?? symbol,
    price,
    previousClose: prev,
    change,
    changePercent: prev ? (change / prev) * 100 : 0,
    currency: m.currency ?? "KRW",
  }
}

/** 여러 심볼의 시세를 병렬로 조회 */
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const settled = await Promise.allSettled(symbols.map((s) => getQuote(s)))
  const out: Quote[] = []
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) out.push(r.value)
  }
  return out
}

/** 차트(시계열) 데이터 조회 */
export async function getChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<ChartResponse | null> {
  const result = await fetchChart(symbol, range, interval)
  if (!result) return null
  const ts = result.timestamp ?? []
  const closes = result.indicators?.quote?.[0]?.close ?? []
  const points = ts
    .map((t, i) => ({ t, close: closes[i] }))
    .filter((p): p is { t: number; close: number } => typeof p.close === "number")
  const m = result.meta
  return {
    symbol,
    name: findMeta(symbol)?.name ?? m.longName ?? m.shortName ?? symbol,
    range,
    points,
    previousClose: m.chartPreviousClose ?? m.previousClose ?? points[0]?.close ?? 0,
  }
}
