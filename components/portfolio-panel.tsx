"use client"

// "내 투자" 탭: 보유 종목 손익 + 추가/삭제 + 보유 종목 관련 뉴스.
import * as React from "react"
import { Loader2, Minus, Plus, Search, Trash2, TrendingUp, Wallet, X } from "lucide-react"

import type { Quote } from "@/lib/types"
import type { StockMeta } from "@/lib/stocks"
import { fetchHistoricalPrice, loadStockIndex } from "@/lib/api-client"
import { rankStocks, type SearchHit, type SlimStock } from "@/lib/stock-search"
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
  onUpdateShares,
  onSelect,
}: {
  holdings: Holding[]
  ready: boolean
  quotes: Record<string, Quote>
  onAdd: (h: Holding) => void
  onRemove: (symbol: string) => void
  onUpdateShares: (symbol: string, shares: number) => void
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
                    onUpdateShares={(shares) => onUpdateShares(h.symbol, shares)}
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
  onUpdateShares,
  onSelect,
}: {
  holding: Holding
  quote?: Quote
  onRemove: () => void
  onUpdateShares: (shares: number) => void
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
          평단 {fmtPrice(holding.avgPrice)}
        </div>
      </button>

      {/* 보유 수량 +/- 조절 */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onUpdateShares(holding.shares - 1)}
          disabled={holding.shares <= 1}
          aria-label="수량 1주 줄이기"
        >
          <Minus />
        </Button>
        <span className="w-12 text-center text-sm font-medium tabular-nums">
          {holding.shares.toLocaleString("ko-KR")}주
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onUpdateShares(holding.shares + 1)}
          aria-label="수량 1주 늘리기"
        >
          <Plus />
        </Button>
      </div>

      <div className="w-28 shrink-0 text-right">
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

// "yyyymmdd" → "yyyy.mm.dd" (자동 조회된 거래일 표시용)
function fmtDayKey(key: string): string {
  return `${key.slice(0, 4)}.${key.slice(4, 6)}.${key.slice(6, 8)}`
}

// 로컬 기준 오늘 날짜 "YYYY-MM-DD" (date 입력의 max 값)
function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function AddHoldingForm({
  holdings,
  onAdd,
}: {
  holdings: Holding[]
  onAdd: (h: Holding) => void
}) {
  // 검색으로 선택한 종목 (없으면 아직 미선택)
  const [selected, setSelected] = React.useState<SearchHit | null>(null)
  const [shares, setShares] = React.useState("")
  const [avgPrice, setAvgPrice] = React.useState("")
  // 매수일(선택): 입력하면 그날 종가를 평균단가에 자동으로 채운다.
  const [buyDate, setBuyDate] = React.useState("")
  const [priceLoading, setPriceLoading] = React.useState(false)
  const [priceInfo, setPriceInfo] = React.useState<{ date: string } | null>(null)
  const [priceError, setPriceError] = React.useState(false)

  const today = React.useMemo(todayStr, [])

  // 종목 + 매수일이 모두 정해지면 그날(또는 직전 거래일) 종가를 조회해 평균단가에 채운다.
  // 평균단가를 직접 수정한 경우엔 의존성에 없으므로 재조회되지 않는다.
  const sym = selected?.symbol
  React.useEffect(() => {
    if (!sym || !buyDate) {
      setPriceInfo(null)
      setPriceError(false)
      return
    }
    let ignore = false
    setPriceLoading(true)
    setPriceError(false)
    fetchHistoricalPrice(sym, buyDate)
      .then((r) => {
        if (ignore) return
        setAvgPrice(String(Math.round(r.close)))
        setPriceInfo({ date: r.date })
      })
      .catch(() => {
        if (ignore) return
        setPriceError(true)
        setPriceInfo(null)
      })
      .finally(() => {
        if (!ignore) setPriceLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [sym, buyDate])

  function reset() {
    setSelected(null)
    setShares("")
    setAvgPrice("")
    setBuyDate("")
    setPriceInfo(null)
    setPriceError(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const sh = Number(shares)
    const ap = Number(avgPrice)
    if (!selected || !(sh > 0) || !(ap > 0)) return
    onAdd({ ...selected, shares: sh, avgPrice: ap })
    reset()
  }

  const inputCls =
    "h-9 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
  const labelCls = "mb-1 block text-xs text-muted-foreground"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">+ 투자 종목 추가</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-2">
          <StockSearchPicker
            selected={selected}
            onSelect={setSelected}
            inputCls={inputCls}
          />
          <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
            <label className="block">
              <span className={labelCls}>매수일 (선택)</span>
              <input
                type="date"
                max={today}
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className={cn(inputCls, "w-full")}
                aria-label="매수일"
              />
            </label>
            <label className="block">
              <span className={labelCls}>수량</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="수량"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className={cn(inputCls, "w-full")}
                required
              />
            </label>
            <label className="block">
              <span className={labelCls}>평균단가</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="평균단가"
                value={avgPrice}
                onChange={(e) => {
                  setAvgPrice(e.target.value)
                  // 직접 수정하면 자동 조회 안내를 지운다.
                  setPriceInfo(null)
                  setPriceError(false)
                }}
                className={cn(inputCls, "w-full")}
                required
              />
            </label>
            <Button type="submit" size="lg" disabled={!selected} className="sm:self-end">
              추가
            </Button>
          </div>
        </form>

        {/* 매수일 자동 조회 안내 */}
        {priceLoading && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            그날 시세를 불러오는 중…
          </p>
        )}
        {!priceLoading && priceInfo && (
          <p className="mt-2 text-xs text-muted-foreground">
            {fmtDayKey(priceInfo.date)} 종가를 평균단가에 자동 입력했습니다. 필요하면 직접 수정하세요.
          </p>
        )}
        {!priceLoading && priceError && (
          <p className="mt-2 text-xs text-destructive">
            그날 시세를 불러오지 못했어요. 평균단가를 직접 입력해 주세요.
          </p>
        )}

        {selected && holdings.some((h) => h.symbol === selected.symbol) && (
          <p className="mt-2 text-xs text-muted-foreground">
            이미 보유 중인 종목입니다. 추가하면 수량·평단이 새 값으로 덮어쓰여집니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// 종목 검색 입력 + 드롭다운. 선택 전에는 검색창, 선택 후에는 선택된 종목 칩을 보여준다.
function StockSearchPicker({
  selected,
  onSelect,
  inputCls,
}: {
  selected: SearchHit | null
  onSelect: (stock: SearchHit | null) => void
  inputCls: string
}) {
  const [query, setQuery] = React.useState("")
  const [index, setIndex] = React.useState<SlimStock[] | null>(null)
  const [indexError, setIndexError] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  // 종목 목록을 1회 로드(중복 호출은 api-client 가 캐시로 합쳐줌).
  const ensureIndex = React.useCallback(() => {
    if (index) return
    loadStockIndex()
      .then((list) => {
        setIndex(list)
        setIndexError(false)
      })
      .catch(() => setIndexError(true))
  }, [index])

  const results = React.useMemo(() => {
    if (!index || !query.trim()) return []
    return rankStocks(index, query)
  }, [index, query])

  // 바깥 클릭 시 드롭다운 닫기
  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  function choose(stock: SearchHit) {
    onSelect(stock)
    setQuery("")
    setOpen(false)
  }

  function clearSelection() {
    onSelect(null)
    setQuery("")
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      choose(results[active] ?? results[0])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const loadingIndex = !index && !indexError && query.trim().length > 0

  // 이미 종목을 선택한 상태면 검색창 대신 선택된 종목을 보여준다.
  if (selected) {
    return (
      <div
        className={cn(
          inputCls,
          "flex w-full items-center justify-between gap-2",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{selected.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {selected.code}
          </span>
        </span>
        <button
          type="button"
          aria-label="선택한 종목 지우기"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={clearSelection}
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          placeholder="종목 검색 (예: 삼성전자, 005930)"
          className={cn(inputCls, "w-full pr-7 pl-8")}
          aria-label="종목 검색"
          onFocus={() => {
            ensureIndex()
            if (query) setOpen(true)
          }}
          onChange={(e) => {
            ensureIndex()
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {loadingIndex ? (
          <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          query && (
            <button
              type="button"
              aria-label="검색어 지우기"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setQuery("")
                setOpen(false)
              }}
            >
              <X className="size-4" />
            </button>
          )
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
          {results.map((s, i) => (
            <li key={s.symbol}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
              >
                <span className="truncate font-medium">{s.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{s.code}</span>
                  <span>{s.market}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && (
        <>
          {loadingIndex && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
              종목 목록을 불러오는 중…
            </div>
          )}
          {indexError && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
              종목 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}
          {index && results.length === 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
              검색 결과가 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  )
}
