"use client"

// 메인 화면 상단의 시장 지수 카드 (코스피 / 코스닥).
import type { ChartPoint, Quote } from "@/lib/types"
import type { IndexMeta } from "@/lib/stocks"
import { arrow, changeColor, fmtChange, fmtPct, fmtPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Sparkline } from "@/components/sparkline"

export function IndexCard({
  index,
  quote,
  spark,
  onClick,
}: {
  index: IndexMeta
  quote?: Quote
  spark?: ChartPoint[]
  onClick: () => void
}) {
  const change = quote?.change ?? 0
  const positive = change >= 0

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer gap-2 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between px-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold">{index.name}</span>
            <span className="text-xs text-muted-foreground">{index.shortName}</span>
          </div>
          {quote ? (
            <div className="mt-1">
              <div className="text-2xl font-bold tabular-nums">
                {fmtPrice(quote.price, true)}
              </div>
              <div className={cn("text-sm font-medium tabular-nums", changeColor(change))}>
                {arrow(change)} {fmtChange(change, true)} ({fmtPct(quote.changePercent)})
              </div>
            </div>
          ) : (
            <div className="mt-2 h-12 w-32 animate-pulse rounded bg-muted/50" />
          )}
        </div>
        <div className="pt-1">
          {spark ? (
            <Sparkline points={spark} positive={positive} width={120} height={48} />
          ) : (
            <div className="h-12 w-[120px] animate-pulse rounded bg-muted/40" />
          )}
        </div>
      </div>
    </Card>
  )
}
