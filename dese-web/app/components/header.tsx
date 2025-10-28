'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Menu, X } from 'lucide-react'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-xl font-semibold">Dese Web v5.8.0</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-md p-2 hover:bg-accent"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  )
}
