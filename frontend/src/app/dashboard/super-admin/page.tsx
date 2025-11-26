"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Users, CreditCard, Activity, MoreHorizontal, Loader2 } from "lucide-react";
import { organizationService, type Organization, type SystemStats } from "@/services/organization";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SuperAdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [orgsData, statsData] = await Promise.all([
        organizationService.list(),
        organizationService.getStats()
      ]);
      setOrganizations(orgsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load super admin data", error);
      toast.error("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await organizationService.updateStatus(id, newStatus);
      toast.success("Organizasyon durumu güncellendi");
      loadData(); // Refresh data
    } catch (error) {
      toast.error("Durum güncellenemedi");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">SaaS Yönetim Paneli</h1>
        <Badge variant="secondary" className="text-xs">Super Admin Mode</Badge>
      </div>
      
      {/* Genel İstatistikler */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam MRR</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₺{stats?.totalMRR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground text-green-600">Aylık Tekrarlayan Gelir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Şirketler</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrganizations}</div>
            <p className="text-xs text-muted-foreground text-green-600">Toplam {organizations.length} kayıtlı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Tüm tenantlarda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistem Sağlığı</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">%{stats?.systemHealth}</div>
            <p className="text-xs text-muted-foreground">Tüm servisler operasyonel</p>
          </CardContent>
        </Card>
      </div>

      {/* Müşteri Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Müşteriler (Tenants)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Şirket Adı</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Gelir (Aylık)</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div>{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.slug}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.plan}</Badge></TableCell>
                  <TableCell>{t.users}</TableCell>
                  <TableCell>₺{t.mrr.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={t.status === 'active' ? 'default' : t.status === 'suspended' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {t.status === 'active' && 'Aktif'}
                      {t.status === 'suspended' && 'Askıda'}
                      {t.status === 'cancelled' && 'İptal'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(t.id)}>
                          ID Kopyala
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(t.id, 'active')}>
                          Aktif Et
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(t.id, 'suspended')} className="text-red-600">
                          Askıya Al
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
