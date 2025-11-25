"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building, Users, CreditCard, Activity, AlertTriangle } from "lucide-react";

export default function SuperAdminPage() {
  // Mock data for demonstration
  const tenants = [
    { id: 1, name: "Acme Corp", plan: "Enterprise", status: "active", users: 45, mrr: "₺2.500" },
    { id: 2, name: "Beta Ltd", plan: "Pro", status: "active", users: 12, mrr: "₺799" },
    { id: 3, name: "Gamma A.Ş.", plan: "Starter", status: "suspended", users: 3, mrr: "₺299" },
    { id: 4, name: "Delta İnşaat", plan: "Enterprise", status: "active", users: 89, mrr: "₺2.500" },
    { id: 5, name: "Epsilon Yazılım", plan: "Pro", status: "payment_failed", users: 8, mrr: "₺799" },
  ];

  return (
    <div className="flex flex-col space-y-6">
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
            <div className="text-2xl font-bold">₺45.230</div>
            <p className="text-xs text-muted-foreground text-green-600">+20% geçen aydan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Şirketler</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground text-green-600">+12 yeni bu ay</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,450</div>
            <p className="text-xs text-muted-foreground">+180 yeni kullanıcı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistem Sağlığı</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">%99.9</div>
            <p className="text-xs text-muted-foreground">Tüm sistemler operasyonel</p>
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
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.plan}</Badge></TableCell>
                  <TableCell>{t.users}</TableCell>
                  <TableCell>{t.mrr}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={t.status === 'active' ? 'default' : t.status === 'payment_failed' ? 'destructive' : 'secondary'}
                    >
                      {t.status === 'active' && 'Aktif'}
                      {t.status === 'suspended' && 'Askıda'}
                      {t.status === 'payment_failed' && 'Ödeme Hatası'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button className="text-sm font-medium text-blue-600 hover:underline">Yönet</button>
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

