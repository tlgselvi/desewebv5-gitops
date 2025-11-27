"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Device } from "@/types/iot"

export const columns: ColumnDef<Device>[] = [
  {
    accessorKey: "serialNumber",
    header: "Seri No",
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cihaz Adı
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "type",
    header: "Tip",
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      const typeLabels: Record<string, string> = {
        pool_controller: "Havuz Kontrolcü",
        sensor_hub: "Sensör Hub",
        camera: "Kamera",
      }
      return <div>{typeLabels[type] || type}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      
      if (status === "online") {
        return <Badge variant="default" className="bg-green-600">Çevrimiçi</Badge>
      } else if (status === "offline") {
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Çevrimdışı</Badge>
      } else if (status === "error") {
        return <Badge variant="destructive">Hata</Badge>
      } else {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Bakımda</Badge>
      }
    }
  },
  {
    accessorKey: "lastSeen",
    header: "Son Görülme",
    cell: ({ row }) => {
      const lastSeen = row.getValue("lastSeen") as string | undefined
      if (!lastSeen) return <div className="text-muted-foreground">-</div>
      const date = new Date(lastSeen)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return <div>Az önce</div>
      if (diffMins < 60) return <div>{diffMins} dk önce</div>
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return <div>{diffHours} saat önce</div>
      return <div>{date.toLocaleDateString("tr-TR")} {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
    },
  },
  {
    accessorKey: "isActive",
    header: "Aktif",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean
      return isActive ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aktif</Badge>
      ) : (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pasif</Badge>
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const device = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Menüyü aç</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(device.id)}
            >
              ID Kopyala
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Detayları Görüntüle</DropdownMenuItem>
            <DropdownMenuItem>Telemetri Verileri</DropdownMenuItem>
            <DropdownMenuItem>Ayarlar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Sil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

