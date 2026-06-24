"use client"

// "시총 상위" 탭: 코스피+코스닥 전체에서 시가총액 상위 종목을 보여준다.
// 데이터(목록+실시간 시세)는 네이버 순위 API에서 한 번에 받아온다.
import type { RankItem } from "@/lib/types"
import type { StockMeta } from "@/lib/stocks"
import { arrow, changeColor, fmtPct, fmtPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MarketCapPanel({
  items,
  loading,
  onSelect,
}: {
  items: RankItem[]
  loading?: boolean
  onSelect: (stock: StockMeta) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          🏦 시가총액 상위 (코스피·코스닥 전체)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            시가총액 순위를 불러오는 중…
          </p>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            표시할 데이터가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col">
            {items.map((it, i) => (
              <button
                key={it.symbol}
                onClick={() =>
                  onSelect({
                    symbol: it.symbol,
                    name: it.name,
                    code: it.code,
                    market: it.market,
                  })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{it.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {it.code}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {it.market} · 시총 {it.marketValueText}
                  </span>
                </div>
                <div className="w-28 shrink-0 text-right">
                  <div className="font-semibold tabular-nums">
                    {fmtPrice(it.price)}
                  </div>
                  <div
                    className={cn("text-xs tabular-nums", changeColor(it.change))}
                  >
                    {arrow(it.change)} {fmtPct(it.changePercent)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
