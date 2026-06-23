"use client"

// 테마(반도체주/바이오주/방산주 …) 한 그룹을 카드로 표시.
// 기본은 "당일 상승률 TOP5"를 순위대로 보여주고,
// 테마 내 종목이 모두 하락 중이면 "대표 종목 TOP5"(정의된 대표 순서)로 보여준다.
import * as React from "react"
import { TrendingUp, Star } from "lucide-react"

import type { ChartPoint, Quote } from "@/lib/types"
import type { StockMeta, ThemeGroup } from "@/lib/stocks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StockRow } from "@/components/stock-row"

const TOP_N = 5

export function ThemeSection({
  theme,
  quotes,
  sparks,
  onSelect,
}: {
  theme: ThemeGroup
  quotes: Record<string, Quote>
  sparks: Record<string, ChartPoint[]>
  onSelect: (stock: StockMeta) => void
}) {
  const { mode, list } = React.useMemo(() => {
    const withQuote = theme.stocks.map((stock) => ({
      stock,
      quote: quotes[stock.symbol],
    }))
    const loaded = withQuote.filter((x) => x.quote)

    // 시세가 아직 없으면 대표 순서(원본)로 노출 (로딩 상태는 StockRow가 표시)
    if (loaded.length === 0) {
      return { mode: "loading" as const, list: withQuote.slice(0, TOP_N) }
    }

    // 시세가 있는 종목이 모두 하락(등락률 < 0)이면 대표 종목 TOP5
    const allFalling = loaded.every((x) => (x.quote?.changePercent ?? 0) < 0)
    if (allFalling) {
      return { mode: "famous" as const, list: withQuote.slice(0, TOP_N) }
    }

    // 그 외에는 당일 상승률 높은 순으로 정렬해 TOP5
    const sorted = [...withQuote].sort(
      (a, b) =>
        (b.quote?.changePercent ?? -Infinity) - (a.quote?.changePercent ?? -Infinity),
    )
    return { mode: "gainers" as const, list: sorted.slice(0, TOP_N) }
  }, [theme.stocks, quotes])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="text-lg">{theme.emoji}</span>
          <span>{theme.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {theme.description}
          </span>
          {/* 현재 정렬 기준 배지 */}
          {mode === "gainers" ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
              <TrendingUp className="size-3" /> 상승률 TOP5
            </span>
          ) : mode === "famous" ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Star className="size-3" /> 전 종목 하락 · 대표 종목
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <div className="flex flex-col">
          {list.map(({ stock, quote }, i) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              quote={quote}
              spark={sparks[stock.symbol]}
              rank={i + 1}
              onClick={() => onSelect(stock)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
