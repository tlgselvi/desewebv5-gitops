"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-gray-100 border-r p-4 space-y-4">
      <nav className="flex flex-col gap-2 text-sm">
        <Link href="/" className="hover:font-semibold">
          Dashboard
        </Link>
        <Link href="/optimization" className="hover:font-semibold">
          Optimization
        </Link>
        <Link href="/mcp/aiops" className="hover:font-semibold">
          AIOps
        </Link>
      </nav>
    </aside>
  );
}
