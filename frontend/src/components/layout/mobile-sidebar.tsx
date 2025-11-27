"use client"

/**
 * Mobile Sidebar Component
 * 
 * Provides a slide-out navigation menu for mobile devices.
 * Uses Sheet component from Radix UI for smooth animations.
 */

import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Floating Menu Button */}
      <SheetTrigger asChild>
        <Button 
          size="icon" 
          variant="default" 
          className="fixed bottom-4 right-4 z-50 md:hidden rounded-full shadow-lg h-14 w-14"
          aria-label="Menüyü aç"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      {/* Sidebar Content */}
      <SheetContent 
        side="left" 
        className="w-[280px] p-0 overflow-y-auto"
      >
        {/* Accessibility: Hidden title for screen readers */}
        <VisuallyHidden>
          <SheetTitle>Navigasyon Menüsü</SheetTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span className="font-semibold">Dese EA</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="p-4">
          <AppSidebar onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileSidebar

