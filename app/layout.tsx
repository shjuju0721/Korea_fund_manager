import type { Viewport } from "next"
import { Geist_Mono, Noto_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ColorThemeProvider } from "@/components/color-theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";

// 첫 페인트 전에 저장된 파스텔 팔레트를 적용해 색상 깜빡임을 막는다.
const PALETTE_INIT = `(function(){try{var p=localStorage.getItem('color-palette');if(['green','gray','blue'].indexOf(p)<0)p='green';document.documentElement.dataset.palette=p;}catch(e){document.documentElement.dataset.palette='green';}})();`

// 모바일에서 올바른 스케일과 노치(safe-area) 대응을 보장한다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      data-palette="green"
      className={cn("antialiased", fontMono.variable, "font-sans", notoSans.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PALETTE_INIT }} />
      </head>
      <body>
        <ThemeProvider>
          <ColorThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
