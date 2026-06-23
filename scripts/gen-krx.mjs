// KRX 상장법인목록(KOSPI/KOSDAQ)을 내려받아 lib/krx-stocks.json 으로 생성한다.
// 실행: node scripts/gen-krx.mjs
// 출력 항목: { code, name, market, sector, products }
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
const SRC = "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13"

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
}

async function fetchMarket(marketType, market) {
  const res = await fetch(`${SRC}&marketType=${marketType}`, {
    headers: { "User-Agent": UA },
  })
  const buf = await res.arrayBuffer()
  const html = new TextDecoder("euc-kr").decode(buf)
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  const out = []
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(stripTags)
    if (cells.length < 5) continue // 헤더(th) 행 건너뜀
    // 컬럼: 회사명, 시장구분, 종목코드, 업종, 주요제품, 상장일, ...
    const [name, , codeRaw, sector, products] = cells
    const code = (codeRaw || "").replace(/\D/g, "").padStart(6, "0")
    if (!/^\d{6}$/.test(code) || !name) continue
    out.push({ code, name, market, sector: sector || "", products: products || "" })
  }
  return out
}

const kospi = await fetchMarket("stockMkt", "KOSPI")
const kosdaq = await fetchMarket("kosdaqMkt", "KOSDAQ")
const all = [...kospi, ...kosdaq].sort((a, b) => a.name.localeCompare(b.name, "ko"))

const __dirname = dirname(fileURLToPath(import.meta.url))

// (1) 서버용 전체 데이터(업종/주요제품 포함) — AI 설명 grounding 에 사용
const outPath = join(__dirname, "..", "lib", "krx-stocks.json")
writeFileSync(outPath, JSON.stringify(all), "utf8")

// (2) 클라이언트 검색용 슬림 데이터(코드/이름/시장만) — 브라우저에서 즉시 검색
const slim = all.map((s) => ({ code: s.code, name: s.name, market: s.market }))
const slimPath = join(__dirname, "..", "public", "stocks.json")
writeFileSync(slimPath, JSON.stringify(slim), "utf8")

console.log(`KOSPI ${kospi.length} + KOSDAQ ${kosdaq.length} = ${all.length} 종목`)
console.log(`  서버 데이터: ${outPath}`)
console.log(`  검색 슬림: ${slimPath}`)
