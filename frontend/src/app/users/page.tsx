"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users as UsersIcon, Loader2 } from "lucide-react";
import { userService, UserDto } from "@/lib/user-service";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { KPICard } from "@/components/dashboard/kpi-card";
import { UserDialog } from "@/components/users/user-dialog";

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await userService.getUsers();
      setUsers(result);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Kullanıcı listesi yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active").length;
  const adminUsers = users.filter((u) => u.role === "Admin").length;

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kullanıcılar</h1>
          <p className="text-muted-foreground">
            Sistem kullanıcılarını yönetin, roller ve izinleri düzenleyin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <UserDialog onSuccess={fetchData} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Toplam Kullanıcı"
          value={totalUsers}
          icon={<UsersIcon className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Aktif Kullanıcı"
          value={activeUsers}
          icon={<UsersIcon className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Admin Kullanıcı"
          value={adminUsers}
          icon={<UsersIcon className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-background shadow-sm">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            data={users}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Kullanıcı ara..."
          />
        )}
      </div>
    </div>
  );
}

