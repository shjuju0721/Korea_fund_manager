"use client"

// "주요 뉴스" 탭: 카테고리별 증시 뉴스.
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsList } from "@/components/news-list"

const CATEGORIES: { id: string; label: string; query: string }[] = [
  { id: "market", label: "증시 전체", query: "증시 코스피 코스닥" },
  { id: "kospi", label: "코스피", query: "코스피 지수" },
  { id: "kosdaq", label: "코스닥", query: "코스닥 지수" },
  { id: "semiconductor", label: "반도체", query: "반도체 주식 시황" },
  { id: "bio", label: "바이오", query: "바이오 제약 주식" },
  { id: "defense", label: "방산", query: "방산 방위산업 주식" },
  { id: "battery", label: "2차전지", query: "2차전지 배터리 주식" },
  { id: "foreign", label: "외국인/기관", query: "외국인 기관 순매수 증시" },
]

export function MarketNewsPanel() {
  const [active, setActive] = React.useState(CATEGORIES[0])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📈 주요 증시 뉴스</CardTitle>
        <div className="mt-2 flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <Button
              key={c.id}
              size="xs"
              variant={active.id === c.id ? "default" : "ghost"}
              onClick={() => setActive(c)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <NewsList query={active.query} limit={15} />
      </CardContent>
    </Card>
  )
}
