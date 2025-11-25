"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, RefreshCw, Users, Banknote, Briefcase } from "lucide-react";
import { hrService, Employee } from "@/services/hr";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Yeni Personel
          </Button>
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
      
      {/* Employee List */}
      <div className="rounded-md border bg-background">
        <div className="p-4 border-b">
          <h3 className="font-medium">Personel Listesi</h3>
        </div>
        {isLoading ? (
           <div className="flex h-48 items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : employees.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            Henüz personel kaydı bulunmamaktadır.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Ünvan</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Maaş</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                  <TableCell>{emp.title || '-'}</TableCell>
                  <TableCell>{emp.departmentId || '-'}</TableCell>
                  <TableCell>{new Date(emp.startDate).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: emp.salaryCurrency }).format(emp.salaryAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                      {emp.status === 'active' ? 'Aktif' : emp.status === 'terminated' ? 'Ayrıldı' : 'İzinde'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

