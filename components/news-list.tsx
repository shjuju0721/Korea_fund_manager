"use client"

// 뉴스 목록을 가져와 표시하는 재사용 컴포넌트.
import * as React from "react"
import { ExternalLink, Newspaper } from "lucide-react"

import type { NewsItem } from "@/lib/types"
import { fetchNews } from "@/lib/api-client"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function NewsList({
  query,
  limit = 8,
  className,
}: {
  query: string
  limit?: number
  className?: string
}) {
  // 응답을 요청 쿼리와 함께 저장해, 쿼리가 바뀌면(=아직 로딩 중이면)
  // 자동으로 스켈레톤이 보이도록 한다. (effect 내 동기 setState 회피)
  const [state, setState] = React.useState<{
    q: string
    items: NewsItem[] | null
    error: boolean
  }>({ q: "", items: null, error: false })

  React.useEffect(() => {
    let alive = true
    fetchNews(query, limit)
      .then((res) => alive && setState({ q: query, items: res, error: false }))
      .catch(() => alive && setState({ q: query, items: null, error: true }))
    return () => {
      alive = false
    }
  }, [query, limit])

  const loaded = state.q === query
  const items = loaded ? state.items : null
  const error = loaded && state.error

  if (error) {
    return <p className="text-sm text-muted-foreground">뉴스를 불러오지 못했습니다.</p>
  }
  if (items === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    )
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">관련 뉴스가 없습니다.</p>
  }

  return (
    <ul className={cn("divide-y", className)}>
      {items.map((n, i) => (
        <li key={`${n.link}-${i}`}>
          <a
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 py-2.5 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-lg"
          >
            <Newspaper className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm leading-snug group-hover:text-primary">
                {n.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {n.source} · {relativeTime(n.pubDate)}
              </p>
            </div>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </li>
      ))}
    </ul>
  )
}
