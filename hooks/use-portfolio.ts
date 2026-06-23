"use client"

// 내가 투자한 종목(보유) 을 브라우저 localStorage 에 저장/관리하는 훅.
// 외부 저장소(localStorage)와 동기화하므로 useSyncExternalStore 를 사용한다.
// (다른 탭에서의 변경도 storage 이벤트로 반영됨)
import * as React from "react"

import type { StockMeta } from "@/lib/stocks"

export type Holding = StockMeta & {
  /** 보유 수량 */
  shares: number
  /** 평균 매입 단가 */
  avgPrice: number
}

const KEY = "kr-stock-portfolio-v1"
const EVENT = "kr-portfolio-change"
const EMPTY: Holding[] = []

// getSnapshot 은 값이 바뀌지 않으면 같은 참조를 반환해야 하므로 캐싱한다.
let cache: Holding[] = EMPTY
let cacheRaw: string | null = null

function read(): Holding[] {
  if (typeof window === "undefined") return EMPTY
  const raw = window.localStorage.getItem(KEY)
  if (raw === cacheRaw) return cache
  cacheRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed) ? (parsed as Holding[]) : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

function write(next: Holding[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next))
  // 같은 탭에서는 storage 이벤트가 안 오므로 커스텀 이벤트로 알린다.
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

export function usePortfolio() {
  const holdings = React.useSyncExternalStore(subscribe, read, () => EMPTY)
  // 서버에서는 false, 클라이언트 마운트 후 true (하이드레이션 안전)
  const ready = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  const addOrUpdate = React.useCallback((h: Holding) => {
    write([...read().filter((x) => x.symbol !== h.symbol), h])
  }, [])

  const remove = React.useCallback((symbol: string) => {
    write(read().filter((x) => x.symbol !== symbol))
  }, [])

  const has = React.useCallback(
    (symbol: string) => holdings.some((x) => x.symbol === symbol),
    [holdings],
  )

  return { holdings, ready, addOrUpdate, remove, has }
}
