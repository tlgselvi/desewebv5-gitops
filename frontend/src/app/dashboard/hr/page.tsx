"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Users, Banknote, Briefcase, Loader2 } from "lucide-react";
import { hrService, Employee } from "@/services/hr";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/kpi-card";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { CreateEmployeeDialog } from "@/components/hr/create-employee-dialog";

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await hrService.getEmployees();
      setEmployees(result);
    } catch (error) {
      console.error("Failed to fetch HR data", error);
      toast.error("Personel listesi yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate metrics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const totalPayroll = employees.reduce((acc, curr) => acc + Number(curr.salaryAmount), 0);

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İnsan Kaynakları</h1>
          <p className="text-muted-foreground">
            Personel yönetimi, bordro ve organizasyon şeması.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <CreateEmployeeDialog onSuccess={fetchData} />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Toplam Personel"
          value={totalEmployees}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Aktif Çalışan"
          value={activeEmployees}
          icon={<Briefcase className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Aylık Maaş Yükü"
          value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalPayroll)}
          icon={<Banknote className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>
      
      {/* Employee List with DataTable */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-background shadow-sm">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable data={employees} columns={columns} searchKey="fullName" searchPlaceholder="Personel ara..." />
        )}
      </div>
    </div>
  );
}
