// 표시용 포맷 헬퍼 (클라이언트/서버 공용).

/** 가격을 천단위 구분 기호로 (원화 정수, 지수는 소수 2자리) */
export function fmtPrice(n: number, isIndex = false): string {
  if (isIndex) {
    return n.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return Math.round(n).toLocaleString("ko-KR")
}

/** 등락 부호 포함 퍼센트 */
export function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}

/** 등락 부호 포함 변화량 */
export function fmtChange(n: number, isIndex = false): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : ""
  return `${sign}${fmtPrice(Math.abs(n), isIndex)}`
}

/**
 * 한국식 등락 색상.
 * 상승=빨강(text-red-500), 하락=파랑(text-blue-500), 보합=muted
 */
export function changeColor(n: number): string {
  if (n > 0) return "text-red-500"
  if (n < 0) return "text-blue-500"
  return "text-muted-foreground"
}

/** 등락 화살표 */
export function arrow(n: number): string {
  if (n > 0) return "▲"
  if (n < 0) return "▼"
  return "─"
}

/** ISO 날짜를 상대시간(예: 3시간 전)으로 */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return "방금 전"
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  return new Date(iso).toLocaleDateString("ko-KR")
}
