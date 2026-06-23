// GET /api/explain?name=삼성전자&code=005930&market=KOSPI&isIndex=0
//
// Google Gemini API 로 종목(회사)에 대한 중립적인 설명을 생성한다.
// 보안상 Gemini 호출은 반드시 서버에서만 일어나며, API 키(GEMINI_API_KEY)는
// .env.local 에서 읽어와 클라이언트(브라우저)로는 절대 전달되지 않는다.
import type { NextRequest } from "next/server"

import { getByCode } from "@/lib/krx"

export const dynamic = "force-dynamic"

// Gemini 응답은 자주 바뀌지 않으므로 동일 종목 설명은 메모리에 캐시해
// 불필요한 API 호출/요금을 줄인다. (서버 프로세스 수명 동안 유지)
const cache = new Map<string, string>()

const MODEL = "gemini-2.5-flash"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SYSTEM_INSTRUCTION = [
  "당신은 한국 주식 시장을 일반 투자자에게 깊이 있게 설명해 주는 애널리스트형 도우미입니다.",
  "항상 한국어로, 사실과 일반적으로 알려진 정보에 근거해 상세하고 균형 잡힌 설명을 합니다.",
  "특정 가격에서 '지금 사라/팔라' 같은 직접적 매매 추천이나 목표 주가는 절대 제시하지 않습니다.",
  "다만 산업 동향, 실적에 영향을 주는 요인, 기회와 위험(리스크) 요인은 중립적으로 함께 설명할 수 있습니다.",
  "긍정 요인만이 아니라 부정적 요인·불확실성도 균형 있게 다룹니다.",
  "최신 분기 실적의 구체적 수치는 시점에 따라 다를 수 있으므로, 확정적으로 단정하지 말고 '일반적으로/대체로' 같은 표현으로 신중하게 서술합니다.",
  "전문 용어(예: 영업이익률, 부채비율, 수주잔고)는 괄호로 짧게 풀어 설명합니다.",
].join(" ")

function buildPrompt(
  name: string,
  isIndex: boolean,
  ground?: { code: string; sector: string; products: string },
): string {
  if (isIndex) {
    return [
      `'${name}' 지수에 대해 일반 투자자가 이해하기 쉽게 한국어로 설명해 주세요.`,
      "어떤 시장/종목들을 대표하는 지수인지, 어떻게 산출되며 무엇을 의미하는지,",
      "이 지수에 영향을 주는 거시 요인(금리·환율·업황 등)은 무엇인지 중심으로",
      "5~7문장으로 설명하세요. 특정 시점의 매매 추천이나 목표 수치는 제시하지 마세요.",
    ].join(" ")
  }

  const groundLine = ground
    ? `참고용 공식 정보(한국거래소): 종목코드 ${ground.code}, 업종 '${ground.sector}', 주요제품 '${ground.products}'. 이 정보를 바탕으로 정확히 설명하세요.`
    : ""

  return [
    `'${name}'(한국 상장 기업)에 대해 일반 투자자가 투자 판단에 참고할 수 있도록 상세하고 구조적으로 설명해 주세요.`,
    groundLine,
    "아래 항목을 각각 소제목(■)으로 나누어, 항목마다 2~4문장으로 충실하게 작성하세요:",
    "■ 어떤 회사인가 — 업종과 주력 사업, 구체적으로 어떤 제품·서비스를 만들고 어디서 돈을 버는지(매출 구성).",
    "■ 실적·재무 특징 — 매출/영업이익의 대체적인 추세와 수익성, 재무 구조(예: 부채 수준, 현금흐름) 등 일반적으로 알려진 특징. 구체 수치는 시점에 따라 다를 수 있음을 전제로 서술.",
    "■ 매출에 영향을 주는 주요 이슈 — 전방 산업 업황, 주요 고객·전방 수요, 원자재·환율, 정책/규제, 경쟁 구도 등 회사 실적과 직결되는 큰 이슈들.",
    "■ 업황과 전망 관점 — 이 회사가 속한 산업의 흐름과, 향후 실적에 작용할 기회 요인과 위험 요인을 '추천'이 아닌 '관전 포인트' 형태로 균형 있게 정리.",
    "전체 분량은 600~900자 정도로 충실하게 작성하되, 각 소제목 줄은 '■'로 시작하고 줄바꿈으로 구분하세요.",
    "특정 가격에서의 매수/매도 추천이나 목표 주가는 절대 넣지 마세요.",
  ]
    .filter(Boolean)
    .join("\n")
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  promptFeedback?: { blockReason?: string }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const name = sp.get("name")?.trim()
  const isIndex = sp.get("isIndex") === "1"
  const code = sp.get("code")?.trim()

  if (!name) {
    return Response.json({ error: "name 파라미터가 필요합니다." }, { status: 400 })
  }

  // 종목코드가 있으면 한국거래소 공식 업종/주요제품을 근거로 함께 제공해
  // 소형주도 정확하게 설명되도록 한다.
  const krx = code ? getByCode(code) : undefined
  const ground = krx
    ? { code: krx.code, sector: krx.sector, products: krx.products }
    : undefined

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요." },
      { status: 500 },
    )
  }

  const cacheKey = `${isIndex ? "idx" : "stk"}:${code || name}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return Response.json({ text: cached, cached: true })
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 키는 요청 헤더로만 전송된다. 클라이언트에는 노출되지 않는다.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: buildPrompt(name, isIndex, ground) }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          // gemini-2.5-flash 는 기본적으로 '사고(thinking)'에 출력 토큰을 소비해
          // 설명이 중간에 잘릴 수 있다. 이 설명 작업에는 사고가 불필요하므로 꺼서
          // 전체 토큰 예산을 답변에 사용하고 잘림을 방지한다.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      // 키/모델/쿼터 오류 등. 상세 메시지는 서버 로그로만 남기고 일반화한 메시지 반환.
      const detail = await res.text().catch(() => "")
      console.error("Gemini API 오류:", res.status, detail)
      return Response.json(
        { error: "AI 설명 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 },
      )
    }

    const data = (await res.json()) as GeminiResponse
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim()

    if (!text) {
      const reason = data.promptFeedback?.blockReason
      console.error("Gemini 빈 응답:", reason ?? "unknown")
      return Response.json(
        { error: "AI 설명을 생성하지 못했습니다." },
        { status: 502 },
      )
    }

    cache.set(cacheKey, text)
    return Response.json({ text })
  } catch (err) {
    console.error("Gemini 호출 예외:", err)
    return Response.json(
      { error: "AI 설명 생성 중 오류가 발생했습니다." },
      { status: 502 },
    )
  }
}
