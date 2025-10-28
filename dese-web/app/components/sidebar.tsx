'use client'

import { useState } from 'react'
import { BarChart3, Activity, AlertTriangle, Settings, Home, MessageSquare, X } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'AIOps', href: '/aiops', icon: Activity },
  { name: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Metrics', href: '/metrics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-card border-r">
            <div className="flex h-16 items-center justify-between px-6">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button onClick={() => setSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="px-4 py-6">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <item.icon size={20} />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-card border-r">
          <div className="flex h-16 items-center px-6">
            <h2 className="text-lg font-semibold">Navigation</h2>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                <item.icon size={20} />
                {item.name}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}
