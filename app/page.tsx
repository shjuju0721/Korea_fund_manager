"use client"

// 한국 주식 차트 대시보드 메인 화면.
// 탭: 대시보드(지수+테마별), 급등주, 하락주, 실적 우량주 20선, 내 투자, 주요 뉴스.
import * as React from "react"
import {
  Coins,
  LineChart,
  Newspaper,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react"

import type { ChartPoint, Quote, RankItem } from "@/lib/types"
import { ALL_STOCKS, INDICES, THEMES, type StockMeta } from "@/lib/stocks"
import { fetchMarketCapTop, fetchQuotes, fetchSparks } from "@/lib/api-client"
import { usePortfolio } from "@/hooks/use-portfolio"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { IndexCard } from "@/components/index-card"
import { ThemeSection } from "@/components/theme-section"
import { PortfolioPanel } from "@/components/portfolio-panel"
import { MarketNewsPanel } from "@/components/market-news-panel"
import { RankingPanel } from "@/components/ranking-panel"
import { TopPicksPanel } from "@/components/top-picks-panel"
import { StockDialog } from "@/components/stock-dialog"
import { StockSearch } from "@/components/stock-search"
import { MarketCapPanel } from "@/components/marketcap-panel"

type Tab =
  | "dashboard"
  | "gainers"
  | "losers"
  | "top-picks"
  | "marketcap"
  | "portfolio"
  | "news"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "대시보드", icon: <LineChart className="size-4" /> },
  { id: "gainers", label: "급등주", icon: <TrendingUp className="size-4" /> },
  { id: "losers", label: "하락주", icon: <TrendingDown className="size-4" /> },
  { id: "top-picks", label: "실적 우량주 20선", icon: <Trophy className="size-4" /> },
  { id: "marketcap", label: "시총 상위", icon: <Coins className="size-4" /> },
  { id: "portfolio", label: "내 투자", icon: <Wallet className="size-4" /> },
  { id: "news", label: "주요 뉴스", icon: <Newspaper className="size-4" /> },
]

export default function Page() {
  const [tab, setTab] = React.useState<Tab>("dashboard")
  const [quotes, setQuotes] = React.useState<Record<string, Quote>>({})
  const [sparks, setSparks] = React.useState<Record<string, ChartPoint[]>>({})
  const [loading, setLoading] = React.useState(false)
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null)
  // 시총 상위 종목 (네이버 순위 API). "시총 상위" 탭에서만 로드/갱신한다.
  const [topCap, setTopCap] = React.useState<RankItem[]>([])
  const [capLoading, setCapLoading] = React.useState(false)
  const [selected, setSelected] = React.useState<{
    stock: { symbol: string; name: string; code?: string; market?: string }
    isIndex: boolean
  } | null>(null)

  const portfolio = usePortfolio()

  // 시세를 조회할 전체 심볼 목록.
  // 의존성은 반드시 안정적인 참조(portfolio.holdings)여야 한다.
  // 매 렌더마다 새로 만든 배열(예: holdings.map(...))을 의존성에 넣으면
  // 이 useMemo → refreshQuotes(useCallback) → 시세 자동 갱신 effect 가
  // 매 렌더마다 재생성/재실행되어 시세를 쉬지 않고 반복 요청하는
  // 무한 루프가 발생한다(특히 모바일에서 심한 버벅임의 원인).
  const allQuoteSymbols = React.useMemo(
    () => [
      ...new Set([
        ...INDICES.map((i) => i.symbol),
        ...ALL_STOCKS.map((s) => s.symbol),
        ...portfolio.holdings.map((h) => h.symbol),
      ]),
    ],
    [portfolio.holdings],
  )

  // 이미 시세를 가져오는 중이면 중복 요청을 막는다(느린 모바일 회선에서
  // 자동 갱신과 수동 새로고침이 겹쳐 요청이 쌓이는 것을 방지).
  const inFlight = React.useRef(false)
  const refreshQuotes = React.useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const qs = await fetchQuotes(allQuoteSymbols)
      const map: Record<string, Quote> = {}
      for (const q of qs) map[q.symbol] = q
      setQuotes(map)
      setUpdatedAt(new Date())
    } catch {
      // 무시: 다음 새로고침에서 재시도
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [allQuoteSymbols])

  // 시세 최초 로드 + 10초마다 자동 갱신 (네이버 실시간 시세)
  // (effect 본문에서 동기 setState 를 피하기 위해 타이머로 예약)
  React.useEffect(() => {
    const initial = setTimeout(refreshQuotes, 0)
    const id = setInterval(refreshQuotes, 10_000)
    return () => {
      clearTimeout(initial)
      clearInterval(id)
    }
  }, [refreshQuotes])

  // 추세선(스파크라인)은 자주 바뀌지 않으므로 1회만 로드
  React.useEffect(() => {
    const symbols = [...INDICES.map((i) => i.symbol), ...ALL_STOCKS.map((s) => s.symbol)]
    fetchSparks(symbols, "1mo")
      .then(setSparks)
      .catch(() => {})
  }, [])

  // 시총 상위: 해당 탭일 때만 로드하고 10초마다 갱신(불필요한 요청 방지).
  React.useEffect(() => {
    if (tab !== "marketcap") return
    let alive = true
    const load = () => {
      setCapLoading(true)
      fetchMarketCapTop(100)
        .then((items) => alive && setTopCap(items))
        .catch(() => {})
        .finally(() => alive && setCapLoading(false))
    }
    load()
    const id = setInterval(load, 10_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [tab])

  const selectStock = (stock: StockMeta) =>
    setSelected({ stock, isIndex: false })

  // 추적 종목들의 실시간 시세를 등락률 순으로 정렬해 급등주/하락주를 만든다.
  const quotesLoaded = Object.keys(quotes).length > 0
  const rankedStocks = React.useMemo(() => {
    return ALL_STOCKS.map((stock) => ({ stock, quote: quotes[stock.symbol] }))
      .filter(
        (x): x is { stock: StockMeta; quote: Quote } => x.quote !== undefined,
      )
      .sort((a, b) => b.quote.changePercent - a.quote.changePercent)
  }, [quotes])
  const gainers = rankedStocks.slice(0, 10)
  const losers = rankedStocks.slice(-10).reverse()

  const currentTitle = TABS.find((t) => t.id === tab)?.label ?? ""

  return (
    <SidebarProvider>
      {/* 왼쪽 세로 사이드바 네비게이션 */}
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="text-xl">📊</span>
            <span className="text-base font-bold group-data-[collapsible=icon]:hidden">
              한국 주식 차트
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>메뉴</SidebarGroupLabel>
            <SidebarMenu>
              {TABS.map((t) => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton
                    isActive={tab === t.id}
                    tooltip={t.label}
                    onClick={() => setTab(t.id)}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="px-2 py-1 text-[10px] leading-tight text-muted-foreground group-data-[collapsible=icon]:hidden">
            시세: 네이버 금융 (실시간)
            <br />
            뉴스: Google 뉴스
          </p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* 상단 바 */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/80 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <h1 className="hidden text-base font-bold sm:block">{currentTitle}</h1>
          {/* 종목 검색: 선택 시 오른쪽 상세 패널을 연다 */}
          <div className="min-w-0 flex-1">
            <StockSearch onSelect={selectStock} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {updatedAt && (
              <span className="hidden text-xs text-muted-foreground md:inline">
                {updatedAt.toLocaleTimeString("ko-KR")} 기준
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshQuotes}
              disabled={loading}
              aria-label="새로고침"
            >
              <RefreshCw className={cn(loading && "animate-spin")} />
              {/* 좁은 화면에서는 아이콘만 노출 */}
              <span className="hidden sm:inline">새로고침</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-5">
          {tab === "dashboard" && (
          <div className="space-y-5">
            {/* 시장 지수 */}
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                시장 지수
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {INDICES.map((idx) => (
                  <IndexCard
                    key={idx.symbol}
                    index={idx}
                    quote={quotes[idx.symbol]}
                    spark={sparks[idx.symbol]}
                    onClick={() =>
                      setSelected({
                        stock: { symbol: idx.symbol, name: idx.name },
                        isIndex: true,
                      })
                    }
                  />
                ))}
              </div>
            </section>

            {/* 테마별 종목 */}
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                테마별 종목
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {THEMES.map((theme) => (
                  <ThemeSection
                    key={theme.id}
                    theme={theme}
                    quotes={quotes}
                    sparks={sparks}
                    onSelect={selectStock}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "gainers" && (
          <RankingPanel
            title="급등주 (상승률 상위)"
            icon={<TrendingUp className="size-4 text-red-500" />}
            items={gainers}
            sparks={sparks}
            loading={!quotesLoaded}
            onSelect={selectStock}
          />
        )}

        {tab === "losers" && (
          <RankingPanel
            title="하락주 (하락률 상위)"
            icon={<TrendingDown className="size-4 text-blue-500" />}
            items={losers}
            sparks={sparks}
            loading={!quotesLoaded}
            onSelect={selectStock}
          />
        )}

        {tab === "top-picks" && (
          <TopPicksPanel quotes={quotes} onSelect={selectStock} />
        )}

        {tab === "marketcap" && (
          <MarketCapPanel
            items={topCap}
            loading={capLoading && topCap.length === 0}
            onSelect={selectStock}
          />
        )}

        {tab === "portfolio" && (
          <PortfolioPanel
            holdings={portfolio.holdings}
            ready={portfolio.ready}
            quotes={quotes}
            onAdd={portfolio.addOrUpdate}
            onRemove={portfolio.remove}
            onSelect={selectStock}
          />
        )}

          {tab === "news" && <MarketNewsPanel />}
        </main>

        <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
          시세·차트: 네이버 금융(실시간, 10초 갱신) · 뉴스: Google 뉴스
          <br />
          투자 판단의 책임은 본인에게 있습니다.
        </footer>
      </SidebarInset>

      {/* 종목/지수 상세 모달 */}
      {selected && (
        <StockDialog
          stock={selected.stock}
          quote={quotes[selected.stock.symbol]}
          isIndex={selected.isIndex}
          onClose={() => setSelected(null)}
          onAddToPortfolio={
            selected.isIndex
              ? undefined
              : (meta) => {
                  // 기본 1주/현재가로 추가 후 내 투자 탭으로 이동
                  const price = quotes[meta.symbol]?.price ?? 0
                  portfolio.addOrUpdate({
                    ...meta,
                    shares: 1,
                    avgPrice: Math.round(price),
                  })
                  setSelected(null)
                  setTab("portfolio")
                }
          }
        />
      )}
    </SidebarProvider>
  )
}
