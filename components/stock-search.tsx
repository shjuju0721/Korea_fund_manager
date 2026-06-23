"use client"

// 종목 검색창 (하이브리드 방식).
// 검색창을 처음 사용할 때 전체 상장사 슬림 목록(/stocks.json)을 1회만 내려받아
// 캐시하고, 이후 입력은 브라우저 메모리에서 즉시 필터링한다(네트워크 왕복 없음).
import * as React from "react"
import { Loader2, Search, X } from "lucide-react"

import { loadStockIndex } from "@/lib/api-client"
import { rankStocks, type SearchHit, type SlimStock } from "@/lib/stock-search"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export function StockSearch({
  onSelect,
}: {
  onSelect: (stock: SearchHit) => void
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

  // 검색은 메모리에서 즉시 수행 — 디바운스/네트워크 없음.
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

  // 목록을 아직 받는 중인지(타이핑했는데 index 가 없을 때) 여부
  const loadingIndex = !index && !indexError && query.trim().length > 0

  return (
    <div ref={wrapRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder="종목 검색 (예: 삼천당제약, 035900)"
          className="pr-7 pl-8"
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
