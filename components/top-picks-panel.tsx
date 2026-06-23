"use client"

// "실적 우량주 20선" 탭: 대표 우량주 20종목을 실시간 시세로 표 형태 표시.
import { Trophy } from "lucide-react"

import type { Quote } from "@/lib/types"
import { TOP_PICKS, type StockMeta } from "@/lib/stocks"
import { arrow, changeColor, fmtPct, fmtPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TopPicksPanel({
  quotes,
  onSelect,
}: {
  quotes: Record<string, Quote>
  onSelect: (stock: StockMeta) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4" /> 실적 우량주 20선
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">종목명</th>
                <th className="px-3 py-2 text-left font-medium">코드</th>
                <th className="px-3 py-2 text-right font-medium">현재가</th>
                <th className="px-3 py-2 text-right font-medium">등락률</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PICKS.map((s) => {
                const q = quotes[s.symbol]
                const change = q?.changePercent ?? 0
                return (
                  <tr
                    key={s.symbol}
                    onClick={() => onSelect(s)}
                    className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {s.code}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {q ? fmtPrice(q.price) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums",
                        q ? changeColor(change) : "text-muted-foreground",
                      )}
                    >
                      {q ? `${arrow(change)} ${fmtPct(change)}` : "…"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
