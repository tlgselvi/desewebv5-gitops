"use client";

import type { ReactNode } from "react";

interface McpLayoutProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly subtitle?: string;
  readonly footerNote?: string;
}

export function McpLayout({
  children,
  title = "Dese EA Plan v7.1.0",
  subtitle = "Enterprise SaaS Platform & Production Ready",
  footerNote = "© 2025 Dese MCP",
}: McpLayoutProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className="min-h-[calc(100vh-12rem)] rounded-3xl bg-gray-50 px-6 py-6 text-gray-900 shadow-sm ring-1 ring-gray-100 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-gray-600 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </header>
      <section className="mx-auto mt-6 max-w-6xl space-y-10">{children}</section>
      <footer className="mt-10 text-sm text-gray-500 dark:text-slate-400">{footerNote}</footer>
    </div>
  );
}

export default McpLayout;

