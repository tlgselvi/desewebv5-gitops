"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { hrService, type CreateEmployeeDTO } from "@/services/hr";
import { toast } from "sonner";

export function CreateEmployeeDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateEmployeeDTO>({
    firstName: "",
    lastName: "",
    tckn: "",
    email: "",
    phone: "",
    title: "",
    departmentId: "",
    startDate: new Date().toISOString().split('T')[0], // Bugünün tarihi
    salaryAmount: 0,
    salaryCurrency: "TRY",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Ad ve soyad zorunludur");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("E-posta adresi zorunludur");
      return;
    }

    if (!formData.tckn.trim() || formData.tckn.length !== 11) {
      toast.error("TC Kimlik No 11 haneli olmalıdır");
      return;
    }

    try {
      setIsLoading(true);
      await hrService.createEmployee(formData);
      toast.success("Personel başarıyla eklendi");
      setOpen(false);
      // Formu sıfırla
      setFormData({
        firstName: "",
        lastName: "",
        tckn: "",
        email: "",
        phone: "",
        title: "",
        departmentId: "",
        startDate: new Date().toISOString().split('T')[0],
        salaryAmount: 0,
        salaryCurrency: "TRY",
      });
      // Callback çağır (sayfa yenileme için)
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to create employee", error);
      toast.error("Personel eklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Yeni Personel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Personel Ekle</DialogTitle>
            <DialogDescription>
              Sisteme yeni bir personel kaydı ekleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Ad *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Örn: Ahmet"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Soyad *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Örn: Yılmaz"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tckn">TC Kimlik No *</Label>
                <Input
                  id="tckn"
                  value={formData.tckn}
                  onChange={(e) => setFormData({ ...formData, tckn: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  placeholder="11 haneli TC Kimlik No"
                  maxLength={11}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ornek@email.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Ünvan</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Örn: Yazılım Geliştirici"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">İşe Başlama Tarihi *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="departmentId">Departman</Label>
                <Input
                  id="departmentId"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  placeholder="Departman ID (opsiyonel)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="salaryAmount">Maaş (₺) *</Label>
                <Input
                  id="salaryAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salaryAmount || ""}
                  onChange={(e) => setFormData({ ...formData, salaryAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salaryCurrency">Para Birimi</Label>
                <Select
                  value={formData.salaryCurrency}
                  onValueChange={(value) => setFormData({ ...formData, salaryCurrency: value })}
                >
                  <SelectTrigger id="salaryCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

