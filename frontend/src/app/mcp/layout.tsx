import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: "%s | MCP Modülleri",
    default: "MCP Modülleri",
  },
  description: "Dese EA Plan MCP (Model Context Protocol) modülleri - FinBot, MuBot, AIOps ve daha fazlası",
}

export default function McpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

