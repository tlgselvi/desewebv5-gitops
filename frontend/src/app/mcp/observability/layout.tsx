import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Observability MCP",
  description: "Prometheus, Grafana, Loki ve Kyverno etkinliklerinden gelen metrik ve alarm orkestrasyonu",
  openGraph: {
    title: "Observability MCP | Dese EA Plan",
    description: "SRE ve AIOps için gözlemlenebilirlik platformu",
  },
}

export default function ObservabilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

