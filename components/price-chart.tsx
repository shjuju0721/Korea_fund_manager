"use client"

// 마우스 호버로 가격을 볼 수 있는 라인 차트 (의존성 없이 SVG 로 구현).
import * as React from "react"

import type { ChartPoint } from "@/lib/types"
import { fmtPrice } from "@/lib/format"

export function PriceChart({
  points,
  previousClose,
  isIndex = false,
  height = 240,
}: {
  points: ChartPoint[]
  previousClose: number
  isIndex?: boolean
  height?: number
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const [width, setWidth] = React.useState(640)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        차트 데이터가 없습니다.
      </div>
    )
  }

  const padX = 8
  const padTop = 12
  const padBottom = 22
  const values = points.map((p) => p.close)
  const min = Math.min(...values, previousClose)
  const max = Math.max(...values, previousClose)
  const span = max - min || 1
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom

  const xAt = (i: number) => padX + (i / (values.length - 1)) * innerW
  const yAt = (v: number) => padTop + innerH - ((v - min) / span) * innerH

  const linePts = values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
  const line = linePts.join(" ")
  const last = values[values.length - 1]
  const positive = last >= previousClose
  const color = positive ? "#ef4444" : "#3b82f6"
  const prevY = yAt(previousClose)

  function setHoverFromX(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left
    const ratio = Math.min(1, Math.max(0, (x - padX) / innerW))
    setHover(Math.round(ratio * (values.length - 1)))
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    setHoverFromX(e.clientX, e.currentTarget.getBoundingClientRect())
  }

  // 모바일 터치로도 가격을 확인할 수 있게 한다.
  function onTouch(e: React.TouchEvent<SVGSVGElement>) {
    const t = e.touches[0]
    if (t) setHoverFromX(t.clientX, e.currentTarget.getBoundingClientRect())
  }

  const hoverPoint = hover != null ? points[hover] : null

  return (
    <div ref={wrapRef} className="w-full select-none">
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onTouchEnd={() => setHover(null)}
        className="touch-none"
      >
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 전일 종가 기준선 */}
        <line
          x1={padX}
          x2={width - padX}
          y1={prevY}
          y2={prevY}
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeDasharray="4 4"
          className="text-muted-foreground"
        />

        {/* 영역 + 선 */}
        <polygon
          points={`${padX},${padTop + innerH} ${line} ${width - padX},${padTop + innerH}`}
          fill="url(#area-fill)"
        />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 호버 표시 */}
        {hover != null && (
          <>
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={padTop}
              y2={padTop + innerH}
              stroke="currentColor"
              strokeOpacity="0.3"
              className="text-muted-foreground"
            />
            <circle
              cx={xAt(hover)}
              cy={yAt(values[hover])}
              r="3.5"
              fill={color}
              stroke="var(--background)"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      <div className="mt-1 flex h-5 items-center justify-between px-1 text-xs text-muted-foreground">
        {hoverPoint ? (
          <>
            <span>
              {new Date(hoverPoint.t * 1000).toLocaleString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="font-medium text-foreground">
              {fmtPrice(hoverPoint.close, isIndex)}
            </span>
          </>
        ) : (
          <>
            <span>
              {new Date(points[0].t * 1000).toLocaleDateString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
            <span>
              {new Date(points[points.length - 1].t * 1000).toLocaleDateString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
