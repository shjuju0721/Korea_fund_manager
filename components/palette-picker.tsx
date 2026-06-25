"use client"

// 사이드바에 들어가는 파스텔 테마 선택 UI (초록 / 회색 / 파랑).
import { Check } from "lucide-react"

import { useColorTheme, type Palette } from "@/components/color-theme-provider"
import { cn } from "@/lib/utils"

const OPTIONS: { id: Palette; label: string; swatch: string }[] = [
  { id: "green", label: "초록", swatch: "oklch(0.62 0.11 163)" },
  { id: "gray", label: "회색", swatch: "oklch(0.55 0.02 255)" },
  { id: "blue", label: "파랑", swatch: "oklch(0.6 0.12 250)" },
]

export function PalettePicker() {
  const { palette, setPalette } = useColorTheme()

  return (
    <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5">
      <span className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
        테마
      </span>
      <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:flex-col">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setPalette(o.id)}
            aria-label={`${o.label} 테마`}
            aria-pressed={palette === o.id}
            title={`${o.label} 테마`}
            className={cn(
              "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-sidebar transition-shadow",
              palette === o.id && "ring-2 ring-ring",
            )}
            style={{ backgroundColor: o.swatch }}
          >
            {palette === o.id && (
              <Check className="size-3.5 text-white" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
