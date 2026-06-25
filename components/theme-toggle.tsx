"use client"

// 사이드바에 들어가는 라이트/다크/시스템 모드 선택 UI.
// next-themes 의 setTheme 를 사용한다.
import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

const OPTIONS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "light", label: "밝게", icon: <Sun className="size-4" /> },
  { id: "dark", label: "어둡게", icon: <Moon className="size-4" /> },
  { id: "system", label: "시스템", icon: <Monitor className="size-4" /> },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // 서버/클라이언트 불일치를 피하기 위해 마운트 후에만 현재값을 표시.
  React.useEffect(() => setMounted(true), [])
  const current = mounted ? (theme ?? "system") : undefined

  return (
    <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5">
      <span className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
        모드
      </span>
      <div className="flex items-center gap-1 rounded-full border bg-background p-0.5 group-data-[collapsible=icon]:flex-col">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setTheme(o.id)}
            aria-label={`${o.label} 모드`}
            aria-pressed={current === o.id}
            title={`${o.label} 모드`}
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
              current === o.id && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            {o.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
