// GET /api/news?q=삼성전자 주식&limit=10
// Google 뉴스 RSS(무료, 키 불필요)를 서버에서 가져와 JSON 으로 변환한다.
import type { NextRequest } from "next/server"

import type { NewsItem } from "@/lib/types"

export const dynamic = "force-dynamic"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim()
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return m ? decodeEntities(m[1]) : ""
}

function parseRss(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = []
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  for (const block of blocks) {
    const rawTitle = pick(block, "title")
    const link = pick(block, "link")
    const pubDate = pick(block, "pubDate")
    const source = pick(block, "source")
    // Google 뉴스 제목은 "제목 - 언론사" 형태이므로 언론사 부분을 정리
    let title = rawTitle
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3))
    }
    if (!title || !link) continue
    let iso = pubDate
    const d = pubDate ? new Date(pubDate) : null
    if (d && !Number.isNaN(d.getTime())) iso = d.toISOString()
    items.push({ title, link, source: source || "Google 뉴스", pubDate: iso })
    if (items.length >= limit) break
  }
  return items
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const q = sp.get("q")?.trim()
  const limit = Math.min(Number(sp.get("limit")) || 10, 30)
  if (!q) {
    return Response.json({ error: "q 파라미터가 필요합니다." }, { status: 400 })
  }
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    q,
  )}&hl=ko&gl=KR&ceid=KR:ko`

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    })
    if (!res.ok) {
      return Response.json({ error: "뉴스 조회에 실패했습니다." }, { status: 502 })
    }
    const xml = await res.text()
    return Response.json({ items: parseRss(xml, limit) })
  } catch {
    return Response.json({ error: "뉴스 조회에 실패했습니다." }, { status: 502 })
  }
}
