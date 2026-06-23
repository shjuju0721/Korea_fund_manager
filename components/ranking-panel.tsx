"use client"

// "급등주" / "하락주" 탭: 추적 종목들의 실시간 등락률 순위.
import type { ChartPoint, Quote } from "@/lib/types"
import type { StockMeta } from "@/lib/stocks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StockRow } from "@/components/stock-row"

export type RankedStock = { stock: StockMeta; quote: Quote }

export function RankingPanel({
  title,
  icon,
  items,
  sparks,
  loading,
  onSelect,
}: {
  title: string
  icon: React.ReactNode
  items: RankedStock[]
  sparks: Record<string, ChartPoint[]>
  loading?: boolean
  onSelect: (stock: StockMeta) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            실시간 시세를 불러오는 중…
          </p>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            표시할 데이터가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col">
            {items.map(({ stock, quote }, i) => (
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
        )}
      </CardContent>
    </Card>
  )
}
