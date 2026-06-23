"use client"

// "내 투자" 탭: 보유 종목 손익 + 추가/삭제 + 보유 종목 관련 뉴스.
import * as React from "react"
import { Trash2, TrendingUp, Wallet } from "lucide-react"

import type { Quote } from "@/lib/types"
import { ALL_STOCKS, type StockMeta } from "@/lib/stocks"
import type { Holding } from "@/hooks/use-portfolio"
import { changeColor, fmtPct, fmtPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsList } from "@/components/news-list"

export function PortfolioPanel({
  holdings,
  ready,
  quotes,
  onAdd,
  onRemove,
  onSelect,
}: {
  holdings: Holding[]
  ready: boolean
  quotes: Record<string, Quote>
  onAdd: (h: Holding) => void
  onRemove: (symbol: string) => void
  onSelect: (stock: StockMeta) => void
}) {
  // 합계 계산
  const totals = holdings.reduce(
    (acc, h) => {
      const cur = quotes[h.symbol]?.price ?? h.avgPrice
      acc.cost += h.avgPrice * h.shares
      acc.value += cur * h.shares
      return acc
    },
    { cost: 0, value: 0 },
  )
  const totalPl = totals.value - totals.cost
  const totalPct = totals.cost ? (totalPl / totals.cost) * 100 : 0

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        {/* 요약 */}
        <Card>
          <CardContent className="px-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">매입금액</div>
                <div className="font-semibold tabular-nums">
                  {fmtPrice(totals.cost)}원
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">평가금액</div>
                <div className="font-semibold tabular-nums">
                  {fmtPrice(totals.value)}원
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">평가손익</div>
                <div className={cn("font-semibold tabular-nums", changeColor(totalPl))}>
                  {totalPl >= 0 ? "+" : "-"}
                  {fmtPrice(Math.abs(totalPl))}
                  <span className="ml-1 text-xs">({fmtPct(totalPct)})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 보유 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4" /> 내 보유 종목
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            {!ready ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">불러오는 중…</p>
            ) : holdings.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                아직 보유 종목이 없습니다.
                <br />
                아래에서 투자한 종목을 추가해 보세요.
              </p>
            ) : (
              <ul className="flex flex-col">
                {holdings.map((h) => (
                  <HoldingRow
                    key={h.symbol}
                    holding={h}
                    quote={quotes[h.symbol]}
                    onRemove={() => onRemove(h.symbol)}
                    onSelect={() => onSelect(h)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <AddHoldingForm holdings={holdings} onAdd={onAdd} />
      </div>

      {/* 보유 종목 관련 뉴스 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" /> 내 종목 관련 뉴스
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                보유 종목을 추가하면 관련 뉴스가 표시됩니다.
              </p>
            ) : (
              <div className="space-y-4">
                {holdings.map((h) => (
                  <div key={h.symbol}>
                    <p className="mb-1 text-sm font-medium">{h.name}</p>
                    <NewsList query={`${h.name} 주가`} limit={3} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HoldingRow({
  holding,
  quote,
  onRemove,
  onSelect,
}: {
  holding: Holding
  quote?: Quote
  onRemove: () => void
  onSelect: () => void
}) {
  const cur = quote?.price ?? holding.avgPrice
  const cost = holding.avgPrice * holding.shares
  const value = cur * holding.shares
  const pl = value - cost
  const pct = cost ? (pl / cost) * 100 : 0

  return (
    <li className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/40">
      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{holding.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {holding.code}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {holding.shares.toLocaleString("ko-KR")}주 · 평단 {fmtPrice(holding.avgPrice)}
        </div>
      </button>
      <div className="w-32 shrink-0 text-right">
        <div className="font-semibold tabular-nums">{fmtPrice(value)}</div>
        <div className={cn("text-xs tabular-nums", changeColor(pl))}>
          {pl >= 0 ? "+" : "-"}
          {fmtPrice(Math.abs(pl))} ({fmtPct(pct)})
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label="삭제"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </li>
  )
}

function AddHoldingForm({
  holdings,
  onAdd,
}: {
  holdings: Holding[]
  onAdd: (h: Holding) => void
}) {
  const [symbol, setSymbol] = React.useState("")
  const [shares, setShares] = React.useState("")
  const [avgPrice, setAvgPrice] = React.useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const meta = ALL_STOCKS.find((s) => s.symbol === symbol)
    const sh = Number(shares)
    const ap = Number(avgPrice)
    if (!meta || !(sh > 0) || !(ap > 0)) return
    onAdd({ ...meta, shares: sh, avgPrice: ap })
    setSymbol("")
    setShares("")
    setAvgPrice("")
  }

  const inputCls =
    "h-9 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">+ 투자 종목 추가</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">종목 선택…</option>
            {ALL_STOCKS.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="수량"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className={cn(inputCls, "w-full sm:w-24")}
            required
          />
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="평균단가"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            className={cn(inputCls, "w-full sm:w-28")}
            required
          />
          <Button type="submit" size="lg">
            추가
          </Button>
        </form>
        {holdings.some((h) => h.symbol === symbol) && (
          <p className="mt-2 text-xs text-muted-foreground">
            이미 보유 중인 종목입니다. 추가하면 수량·평단이 새 값으로 덮어쓰여집니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
