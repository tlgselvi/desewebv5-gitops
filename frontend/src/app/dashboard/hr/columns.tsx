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
import { Employee } from "@/services/hr"

export const columns: ColumnDef<Employee>[] = [
  {
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    id: "fullName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ad Soyad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "title",
    header: "Ünvan",
    cell: ({ row }) => row.getValue("title") || "-",
  },
  {
    accessorKey: "departmentId",
    header: "Departman",
    cell: ({ row }) => row.getValue("departmentId") || "-",
  },
  {
    accessorKey: "startDate",
    header: "Başlangıç Tarihi",
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"))
      return date.toLocaleDateString("tr-TR")
    },
  },
  {
    accessorKey: "salaryAmount",
    header: () => <div className="text-right">Maaş</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("salaryAmount"))
      const currency = row.original.salaryCurrency || "TRY"
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0
      }).format(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      
      if (status === "active") {
        return <Badge variant="default" className="bg-green-600">Aktif</Badge>
      } else if (status === "on_leave") {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">İzinde</Badge>
      } else {
        return <Badge variant="destructive">Ayrıldı</Badge>
      }
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original
 
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
              onClick={() => navigator.clipboard.writeText(employee.id)}
            >
              ID Kopyala
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Düzenle</DropdownMenuItem>
            <DropdownMenuItem>Bordro Oluştur</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Sil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

