import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MuBot MCP",
  description: "Muhasebe ve ERP entegrasyonları, çok kaynaklı veri mutabakatı ve otomatik KPI takibi",
  openGraph: {
    title: "MuBot MCP | Dese EA Plan",
    description: "Operasyonel muhasebe ve veri mutabakatı",
  },
}

export default function MuBotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

