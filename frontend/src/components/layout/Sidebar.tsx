"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getUserRole } from "@/lib/auth";

export default function Sidebar() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
  }, []);

  return (
    <aside className="w-56 h-screen bg-gray-100 border-r p-4 space-y-4 dark:bg-gray-900">
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
      
      {/* Admin Panel Link - Only visible to admins */}
      {userRole === "admin" && (
        <nav className="flex flex-col gap-2 text-sm mt-auto pt-8 border-t border-gray-300 dark:border-gray-700">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center gap-2 hover:font-semibold text-blue-600 dark:text-blue-400"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin Panel
          </Link>
        </nav>
      )}
    </aside>
  );
}
