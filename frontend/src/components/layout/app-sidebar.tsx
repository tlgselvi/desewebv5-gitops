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
    icon: React.ComponentType<{ className?: string }>
    roles?: string[] // Optional: restricted to these roles
  }[]
}

export function AppSidebar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname()
  const user = useStore((state) => state.user)

  // Menü sıralaması: Yukarıdan aşağıya doğru
  // Icon'ları component olarak tanımlayarak render sırasında oluşturuyoruz
  const navItems = [
    // 1. Genel Bakış (En üstte)
    {
      href: "/dashboard",
      title: "Genel Bakış",
      icon: LayoutDashboard,
    },
    // 2. İş Modülleri (Sırayla)
    {
      href: "/dashboard/finance",
      title: "Finans & Muhasebe",
      icon: Wallet,
      roles: ["admin", "accountant", "manager"],
    },
    {
      href: "/dashboard/crm",
      title: "CRM & Satış",
      icon: Users,
      roles: ["admin", "sales", "manager"],
    },
    {
      href: "/dashboard/inventory",
      title: "Stok Yönetimi",
      icon: Package,
      roles: ["admin", "warehouse_manager"],
    },
    {
      href: "/dashboard/hr",
      title: "İnsan Kaynakları",
      icon: Briefcase,
      roles: ["admin", "hr"],
    },
    {
      href: "/dashboard/iot",
      title: "IoT & Cihazlar",
      icon: Wifi,
      roles: ["admin", "technician"],
    },
    // 3. Ayarlar (Modüllerden sonra)
    {
      href: "/dashboard/settings",
      title: "Ayarlar",
      icon: Settings,
    },
    {
      href: "/dashboard/settings/integrations",
      title: "Entegrasyonlar",
      icon: Wifi,
    },
    // 4. Admin Panelleri (En altta)
    {
      href: "/dashboard/admin/users",
      title: "Admin Paneli",
      icon: ShieldCheck,
      roles: ["admin"],
    },
    {
      href: "/dashboard/super-admin",
      title: "Super Admin",
      icon: ShieldCheck,
      roles: ["super_admin"],
    },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    // If user is not logged in (shouldn't happen here but for safety), hide protected items
    if (!user || !user.role) return false; 
    // Allow if user has one of the required roles
    return item.roles.includes(user.role);
  });

  return (
    <nav
      className={cn(
        "flex flex-col space-y-1", // Her zaman dikey (yukarıdan aşağıya)
        className
      )}
      {...props}
    >
      {filteredNavItems.map((item) => {
        const IconComponent = item.icon;
        const iconClassName = item.href === "/dashboard/super-admin" 
          ? "mr-2 h-4 w-4 text-red-500" 
          : "mr-2 h-4 w-4";
        
        return (
          <Button
            key={item.href}
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start", // Tam genişlik, sola hizalı
              pathname === item.href && "bg-muted hover:bg-muted"
            )}
            asChild
          >
            <Link href={item.href} prefetch={false}>
              <IconComponent className={iconClassName} />
              {item.title}
            </Link>
          </Button>
        );
      })}
    </nav>
  )
}
