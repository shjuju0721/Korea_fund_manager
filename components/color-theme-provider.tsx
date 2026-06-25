"use client"

// 파스텔 색상 팔레트(초록/회색/파랑) 상태를 관리한다.
// next-themes 의 라이트/다크와는 별개로 <html data-palette="..."> 속성을 바꾸며,
// 선택값은 localStorage 에 저장한다. 최초 렌더 깜빡임은 layout 의 인라인 스크립트가 막는다.
import * as React from "react"

export type Palette = "green" | "gray" | "blue"

export const PALETTES: Palette[] = ["green", "gray", "blue"]
export const DEFAULT_PALETTE: Palette = "green"
const STORAGE_KEY = "color-palette"

function isPalette(v: unknown): v is Palette {
  return typeof v === "string" && (PALETTES as string[]).includes(v)
}

type ColorThemeContextValue = {
  palette: Palette
  setPalette: (p: Palette) => void
}

const ColorThemeContext = React.createContext<ColorThemeContextValue | null>(null)

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<Palette>(DEFAULT_PALETTE)

  // 인라인 스크립트가 이미 설정한 data-palette / localStorage 값을 읽어 동기화.
  React.useEffect(() => {
    let init: Palette = DEFAULT_PALETTE
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isPalette(stored)) init = stored
      else if (isPalette(document.documentElement.dataset.palette))
        init = document.documentElement.dataset.palette as Palette
    } catch {
      // localStorage 접근 불가 시 기본값 유지
    }
    setPaletteState(init)
    document.documentElement.dataset.palette = init
  }, [])

  const setPalette = React.useCallback((p: Palette) => {
    setPaletteState(p)
    document.documentElement.dataset.palette = p
    try {
      localStorage.setItem(STORAGE_KEY, p)
    } catch {
      // 무시
    }
  }, [])

  const value = React.useMemo(() => ({ palette, setPalette }), [palette, setPalette])

  return (
    <ColorThemeContext.Provider value={value}>{children}</ColorThemeContext.Provider>
  )
}

export function useColorTheme() {
  const ctx = React.useContext(ColorThemeContext)
  if (!ctx) {
    throw new Error("useColorTheme 는 ColorThemeProvider 안에서만 사용할 수 있습니다.")
  }
  return ctx
}
