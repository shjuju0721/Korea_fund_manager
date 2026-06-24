// 종목 행에 들어가는 작은 추세선 (비상호작용).
import * as React from "react"

import type { ChartPoint } from "@/lib/types"

// React.memo 로 감싸 props(points/positive/크기)가 그대로면 재렌더를 건너뛴다.
// 스파크라인 데이터는 최초 1회만 로드되므로, 60초마다 시세가 갱신돼
// 부모가 다시 렌더되어도 여기서 SVG 경로를 다시 계산하지 않는다(모바일 부담 감소).
function SparklineImpl({
  points,
  positive,
  width = 88,
  height = 32,
}: {
  points: ChartPoint[]
  positive: boolean
  width?: number
  height?: number
}) {
  if (points.length < 2) {
    return <div style={{ width, height }} className="rounded bg-muted/40" />
  }
  const values = points.map((p) => p.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const pad = 2
  const usable = height - pad * 2
  const coords = values.map((v, i) => {
    const x = i * stepX
    const y = pad + usable - ((v - min) / span) * usable
    return [x, y] as const
  })
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const color = positive ? "#ef4444" : "#3b82f6" // 상승 빨강 / 하락 파랑
  const areaId = `spark-${positive ? "up" : "down"}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${line} ${width},${height}`}
        fill={`url(#${areaId})`}
      />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const Sparkline = React.memo(SparklineImpl)
