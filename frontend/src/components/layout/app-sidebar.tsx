"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useStore } from "@/store/useStore"
import {
  LayoutDashboard,
  Settings,
  Wallet,
  Users,
  Package,
  Wifi,
  ShieldCheck,
  Briefcase,
} from "lucide-react"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
    icon: React.ReactNode
    roles?: string[] // Optional: restricted to these roles
  }[]
}

export function AppSidebar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname()
  const user = useStore((state) => state.user)

  const navItems = [
    {
      href: "/dashboard",
      title: "Genel Bakış",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      href: "/dashboard/finance",
      title: "Finans & Muhasebe",
      icon: <Wallet className="mr-2 h-4 w-4" />,
      roles: ["admin", "accountant", "manager"],
    },
    {
      href: "/dashboard/crm",
      title: "CRM & Satış",
      icon: <Users className="mr-2 h-4 w-4" />,
      roles: ["admin", "sales", "manager"],
    },
    {
      href: "/dashboard/inventory",
      title: "Stok Yönetimi",
      icon: <Package className="mr-2 h-4 w-4" />,
      roles: ["admin", "warehouse_manager"],
    },
    {
      href: "/dashboard/hr",
      title: "İnsan Kaynakları",
      icon: <Briefcase className="mr-2 h-4 w-4" />,
      roles: ["admin", "hr"],
    },
    {
      href: "/dashboard/iot",
      title: "IoT & Cihazlar",
      icon: <Wifi className="mr-2 h-4 w-4" />,
      roles: ["admin", "technician"],
    },
    {
      href: "/dashboard/admin/users",
      title: "Admin Paneli",
      icon: <ShieldCheck className="mr-2 h-4 w-4" />,
      roles: ["admin"],
    },
    {
      href: "/dashboard/super-admin",
      title: "Super Admin",
      icon: <ShieldCheck className="mr-2 h-4 w-4 text-red-500" />,
      roles: ["super_admin"],
    },
    {
      href: "/dashboard/settings",
      title: "Ayarlar",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
    {
      href: "/dashboard/settings/integrations",
      title: "Entegrasyonlar",
      icon: <Wifi className="mr-2 h-4 w-4" />,
    },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    // If user is not logged in (shouldn't happen here but for safety), hide protected items
    if (!user) return false; 
    // Allow if user has one of the required roles
    return item.roles.includes(user.role);
  });

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className
      )}
      {...props}
    >
      {filteredNavItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "secondary" : "ghost"}
          className={cn(
            "justify-start",
            pathname === item.href && "bg-muted hover:bg-muted"
          )}
          asChild
        >
          <Link href={item.href} prefetch={false}>
            {item.icon}
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
