"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Package2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/layout/app-sidebar"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Package2 className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Dese EA Plan v5
            </span>
          </Link>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="mr-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link href="/" className="flex items-center space-x-2 mb-4 px-4">
              <Package2 className="h-6 w-6" />
              <span className="font-bold">Dese EA Plan</span>
            </Link>
            <AppSidebar className="px-4" />
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search component could go here */}
          </div>
          <nav className="flex items-center">
            {/* User nav / Theme toggle could go here */}
          </nav>
        </div>
      </div>
    </header>
  )
}

