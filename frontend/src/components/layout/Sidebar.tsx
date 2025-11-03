"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? "bg-blue-100 text-blue-700 font-semibold border-l-4 border-blue-600"
      : "hover:bg-gray-200 text-gray-700";
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 shadow-sm flex flex-col sticky top-0">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 font-sans">Dese EA Plan</h2>
        <p className="text-xs text-gray-500 mt-1 font-sans">v6.7.0</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/")}`}
        >
          <span className="text-lg">📊</span>
          <span>Dashboard</span>
        </Link>
        
        <Link
          href="/projects"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/projects")}`}
        >
          <span className="text-lg">📁</span>
          <span>Projects</span>
        </Link>
        
        <Link
          href="/aiops"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/aiops")}`}
        >
          <span className="text-lg">🤖</span>
          <span>AIOps</span>
        </Link>
        
        <Link
          href="/finbot"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/finbot") || pathname?.startsWith("/finbot")}`}
        >
          <span className="text-lg">💰</span>
          <span>FinBot</span>
        </Link>
        
        <div className="pt-4 mt-4 border-t border-gray-200">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Tools
          </p>
          
          <Link
            href="/seo"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/seo")}`}
          >
            <span className="text-lg">🔍</span>
            <span>SEO Analyzer</span>
          </Link>
          
          <Link
            href="/content"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/content")}`}
          >
            <span className="text-lg">✍️</span>
            <span>Content Generator</span>
          </Link>
          
          <Link
            href="/tools"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/tools")}`}
          >
            <span className="text-lg">🌐</span>
            <span>Browser Automation</span>
          </Link>
        </div>
        
        <div className="pt-4 mt-4 border-t border-gray-200">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Admin
          </p>
          
          <Link
            href="/admin/audit"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/admin/audit") || pathname?.startsWith("/admin/audit")}`}
          >
            <span className="text-lg">🔒</span>
            <span>Audit & Privacy</span>
          </Link>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="px-4 py-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1 font-sans">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 font-sans">Operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
