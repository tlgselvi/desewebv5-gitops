import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FinBot MCP",
  description: "Finansal planlama, gelir projeksiyonları ve Jarvis destekli finansal otomasyon",
  openGraph: {
    title: "FinBot MCP | Dese EA Plan",
    description: "Gelir/gider projeksiyonları, senaryo bazlı planlama",
  },
}

export default function FinBotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

