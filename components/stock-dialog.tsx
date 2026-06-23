"use client"

// 종목/지수 클릭 또는 검색 시 화면 오른쪽에서 슬라이드되어 나오는 상세 패널.
// 구성: AI(Gemini) 회사 설명 + 라인 차트 + 기간 선택 + 관련 뉴스.
import * as React from "react"
import { Plus, Sparkles, X } from "lucide-react"

import type { ChartResponse, Quote } from "@/lib/types"
import type { StockMeta } from "@/lib/stocks"
import { fetchChart, fetchExplain } from "@/lib/api-client"
import { arrow, changeColor, fmtChange, fmtPct, fmtPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PriceChart } from "@/components/price-chart"
import { NewsList } from "@/components/news-list"

const RANGES: { id: string; label: string }[] = [
  { id: "1d", label: "1일" },
  { id: "5d", label: "5일" },
  { id: "1mo", label: "1개월" },
  { id: "3mo", label: "3개월" },
  { id: "6mo", label: "6개월" },
  { id: "1y", label: "1년" },
]

// AI 회사 설명: 종목이 바뀔 때마다 /api/explain 을 호출해 설명을 받아온다.
function AiExplanation({
  name,
  code,
  isIndex,
}: {
  name: string
  code?: string
  isIndex: boolean
}) {
  // 결과를 요청 키와 함께 저장한다. 키(code/name)가 바뀌면 res.key 와
  // 어긋나 자동으로 로딩 상태가 되므로, effect 안에서 동기 setState 가 필요 없다.
  const reqKey = `${isIndex ? "idx" : "stk"}:${code || name}`
  const [res, setRes] = React.useState<{ key: string; text: string; error: string }>({
    key: "",
    text: "",
    error: "",
  })

  React.useEffect(() => {
    let alive = true
    const key = `${isIndex ? "idx" : "stk"}:${code || name}`
    fetchExplain(name, { isIndex, code })
      .then((text) => alive && setRes({ key, text, error: "" }))
      .catch(
        (e: unknown) =>
          alive &&
          setRes({
            key,
            text: "",
            error: e instanceof Error ? e.message : "AI 설명을 불러오지 못했습니다.",
          }),
      )
    return () => {
      alive = false
    }
  }, [name, code, isIndex])

  const loading = res.key !== reqKey
  const state = { loading, text: loading ? "" : res.text, error: loading ? "" : res.error }

  return (
    <section className="rounded-xl border bg-muted/30 p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="size-4 text-violet-500" />
        AI 회사 설명
      </h3>

      {state.loading ? (
        // 데이터를 불러오는 동안 로딩 표시
        <div className="space-y-2" aria-busy="true" aria-label="설명을 불러오는 중">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-[96%]" />
          <Skeleton className="h-3.5 w-3/4" />
          <p className="pt-1 text-xs text-muted-foreground">
            AI가 설명을 생성하는 중입니다…
          </p>
        </div>
      ) : state.error ? (
        <p className="text-sm text-muted-foreground">{state.error}</p>
      ) : (
        <div className="space-y-1.5 text-sm leading-relaxed">
          {state.text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) =>
              line.startsWith("■") ? (
                <p key={i} className="pt-1.5 font-semibold text-foreground">
                  {line.replace(/^■\s*/, "")}
                </p>
              ) : (
                <p key={i} className="text-muted-foreground">
                  {line}
                </p>
              ),
            )}
        </div>
      )}

      {/* 면책 문구 */}
      <p className="mt-3 border-t pt-2 text-[11px] leading-tight text-muted-foreground">
        ⚠️ AI가 생성한 참고용 설명이며 투자 조언이 아닙니다.
      </p>
    </section>
  )
}

export function StockDialog({
  stock,
  quote,
  isIndex = false,
  onClose,
  onAddToPortfolio,
}: {
  stock: { symbol: string; name: string; code?: string; market?: string }
  quote?: Quote
  isIndex?: boolean
  onClose: () => void
  onAddToPortfolio?: (meta: StockMeta) => void
}) {
  const [range, setRange] = React.useState("1mo")
  // 응답을 (심볼+기간) 키와 함께 저장해 키가 바뀌면 자동으로 로딩 상태가 되게 함.
  const reqKey = `${stock.symbol}:${range}`
  const [res, setRes] = React.useState<{ key: string; chart: ChartResponse | null }>({
    key: "",
    chart: null,
  })

  React.useEffect(() => {
    let alive = true
    const key = `${stock.symbol}:${range}`
    fetchChart(stock.symbol, range)
      .then((c) => alive && setRes({ key, chart: c }))
      .catch(() => alive && setRes({ key, chart: null }))
    return () => {
      alive = false
    }
  }, [stock.symbol, range])

  const loading = res.key !== reqKey
  const chart = loading ? null : res.chart

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const change = quote?.change ?? 0
  const newsQuery = isIndex ? `${stock.name} 증시` : `${stock.name} 주가`

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
    >
      {/* 오른쪽 상세 패널 */}
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l bg-card text-card-foreground shadow-xl duration-200 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${stock.name} 상세`}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{stock.name}</h2>
              {stock.code && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {stock.code}
                </span>
              )}
              {stock.market && (
                <span className="text-xs text-muted-foreground">{stock.market}</span>
              )}
            </div>
            {quote && (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {fmtPrice(quote.price, isIndex)}
                </span>
                <span className={cn("text-sm font-medium", changeColor(change))}>
                  {arrow(change)} {fmtChange(change, isIndex)} (
                  {fmtPct(quote.changePercent)})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onAddToPortfolio && stock.code && stock.market && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onAddToPortfolio({
                    symbol: stock.symbol,
                    name: stock.name,
                    code: stock.code!,
                    market: stock.market as "KOSPI" | "KOSDAQ",
                  })
                }
              >
                <Plus /> 보유 추가
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="닫기">
              <X />
            </Button>
          </div>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* AI 회사 설명 (Gemini) */}
          <AiExplanation name={stock.name} code={stock.code} isIndex={isIndex} />

          {/* 차트 */}
          <div>
            <div className="mb-2 flex flex-wrap gap-1">
              {RANGES.map((r) => (
                <Button
                  key={r.id}
                  size="xs"
                  variant={range === r.id ? "default" : "ghost"}
                  onClick={() => setRange(r.id)}
                >
                  {r.label}
                </Button>
              ))}
            </div>

            {loading || !chart ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                {loading ? "차트를 불러오는 중…" : "차트 데이터가 없습니다."}
              </div>
            ) : (
              <PriceChart
                points={chart.points}
                previousClose={chart.previousClose}
                isIndex={isIndex}
              />
            )}
          </div>

          {/* 관련 뉴스 */}
          <div>
            <h3 className="mb-1 text-sm font-semibold">📰 {stock.name} 관련 뉴스</h3>
            <NewsList query={newsQuery} limit={6} />
          </div>
        </div>
      </div>
    </div>
  )
}
