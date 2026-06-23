"use client"

// 테마/리스트 안의 종목 한 줄. 시세 + 미니 추세선 + 클릭 시 상세.
import type { ChartPoint, Quote } from "@/lib/types"
import type { StockMeta } from "@/lib/stocks"
import { arrow, changeColor, fmtPct, fmtPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Sparkline } from "@/components/sparkline"

export function StockRow({
  stock,
  quote,
  spark,
  rank,
  onClick,
}: {
  stock: StockMeta
  quote?: Quote
  spark?: ChartPoint[]
  /** 순위 표시(있을 때만 왼쪽에 번호 노출) */
  rank?: number
  onClick: () => void
}) {
  const change = quote?.change ?? 0
  const positive = change >= 0

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      {rank != null && (
        <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground tabular-nums">
          {rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{stock.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {stock.code}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{stock.market}</span>
      </div>

      <div className="hidden sm:block">
        {spark ? (
          <Sparkline points={spark} positive={positive} />
        ) : (
          <div className="h-8 w-[88px] animate-pulse rounded bg-muted/40" />
        )}
      </div>

      <div className="w-28 shrink-0 text-right">
        {quote ? (
          <>
            <div className="font-semibold tabular-nums">{fmtPrice(quote.price)}</div>
            <div className={cn("text-xs tabular-nums", changeColor(change))}>
              {arrow(change)} {fmtPct(quote.changePercent)}
            </div>
          </>
        ) : (
          <div className="ml-auto h-8 w-20 animate-pulse rounded bg-muted/40" />
        )}
      </div>
    </button>
  )
}
