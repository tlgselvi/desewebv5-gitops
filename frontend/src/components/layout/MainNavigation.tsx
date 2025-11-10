"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly badge?: "priority" | "beta";
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Genel Bakış",
    description: "MCP sağlık, Kyverno ve ArgoCD özetleri",
  },
  {
    href: "/aiops",
    label: "AIOps",
    description: "Drift analizi, alarm akışı ve otomasyon",
  },
  {
    href: "/finbot",
    label: "FinBot",
    description: "Gelir projeksiyonu, bütçe ve senaryo simülasyonları",
    badge: "priority",
  },
  {
    href: "/observability",
    label: "Observability",
    description: "Grafana, Loki ve Tempo metrikleri",
  },
  {
    href: "/login",
    label: "Oturum",
    description: "Rol bazlı erişim ve güvenlik panosu",
  },
];

export default function MainNavigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-300/40 dark:bg-blue-500">
            <Command className="h-5 w-5" />
          </span>
          <div>
            <Link
              href="/"
              className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-slate-100"
            >
              Dese EA Plan
              <Badge variant="outline">v6.8.1</Badge>
            </Link>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Kyverno stabilizasyonu · MCP Faz 1 revizyonu
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          {NAV_ITEMS.map(({ href, label, badge }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-xl px-4 py-2 transition",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
              >
                <span className="block">{label}</span>
                {badge === "priority" && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    kritik
                  </span>
                )}
                {badge === "beta" && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    beta
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="hidden items-center gap-2 md:flex"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Canlı: GKE · Kyverno · ArgoCD
            </span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="hidden md:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Rehber
          </Button>
          <Button variant="primary" size="sm" className="dark:bg-blue-500">
            Yeni Görev Kaydı
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-blue-50/70 text-xs text-gray-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <div className="mx-auto flex w-full max-w-6xl snap-x items-center gap-3 overflow-x-auto px-4 py-2 sm:px-6">
          {NAV_ITEMS.map(({ href, label, description, badge }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);

            return (
              <Link
                key={`${href}-meta`}
                href={href}
                className={cn(
                  "flex min-w-fit snap-center items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-gray-600 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800",
                  isActive && "border-blue-400 text-blue-700 dark:border-blue-500 dark:text-blue-200",
                )}
              >
                <span className="font-semibold">{label}</span>
                {badge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      badge === "priority"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {badge === "priority" ? "kritik" : "beta"}
                  </span>
                )}
                <span className="hidden whitespace-nowrap text-xs text-gray-500 dark:text-slate-400 lg:inline">
                  {description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
