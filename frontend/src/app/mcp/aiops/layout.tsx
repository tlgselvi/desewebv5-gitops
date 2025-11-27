import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Jarvis AIOps MCP",
  description: "Operasyon kontrol merkezi - Kyverno politikaları, ArgoCD senkronizasyonu ve Prometheus alarmları",
  openGraph: {
    title: "Jarvis AIOps MCP | Dese EA Plan",
    description: "GitOps ve AIOps operasyonlarını tek panelden yönetin",
  },
}

export default function AIOpsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

