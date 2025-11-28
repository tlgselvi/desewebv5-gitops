"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserDto } from "@/lib/dtos/user.dto";

export const columns: ColumnDef<UserDto>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ad Soyad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          E-posta
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge variant={role === "Admin" ? "default" : "secondary"}>
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      
      if (status === "Active") {
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            Aktif
          </Badge>
        );
      } else {
        return (
          <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600">
            Pasif
          </Badge>
        );
      }
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Son Giriş",
    cell: ({ row }) => {
      const lastLogin = row.getValue("lastLogin") as string | null;
      
      if (!lastLogin) {
        return <span className="text-muted-foreground">-</span>;
      }
      
      const date = new Date(lastLogin);
      return (
        <div className="text-sm">
          {date.toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
          <span className="text-muted-foreground ml-1">
            {date.toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              // TODO: Implement edit functionality
              console.log("Edit user:", user.id);
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Düzenle</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              // TODO: Implement delete functionality
              console.log("Delete user:", user.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Sil</span>
          </Button>
        </div>
      );
    },
  },
];

