"use client";

import { useState } from "react";
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
import { iotService } from "@/services/iot";
import { toast } from "sonner";

interface CreateDeviceDTO {
  name: string;
  serialNumber: string;
  type: string;
  model?: string;
}

export function CreateDeviceDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDeviceDTO>({
    name: "",
    serialNumber: "",
    type: "sensor",
    model: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Cihaz adı zorunludur");
      return;
    }

    if (!formData.serialNumber.trim()) {
      toast.error("Seri numarası zorunludur");
      return;
    }

    try {
      setIsLoading(true);
      await iotService.createDevice({
        name: formData.name,
        serialNumber: formData.serialNumber,
        type: formData.type,
        model: formData.model || undefined,
      });
      toast.success("Cihaz başarıyla eklendi");
      setOpen(false);
      // Formu sıfırla
      setFormData({
        name: "",
        serialNumber: "",
        type: "sensor",
        model: "",
      });
      // Callback çağır (sayfa yenileme için)
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to create device", error);
      toast.error("Cihaz eklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Cihaz Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Cihaz Ekle</DialogTitle>
            <DialogDescription>
              IoT ağına yeni bir cihaz ekleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Cihaz Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Havuz Sensör Kiti #1"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serialNumber">Seri Numarası *</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="Örn: ESP32-001"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Cihaz Tipi *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sensor">Sensör</SelectItem>
                    <SelectItem value="actuator">Aktüatör</SelectItem>
                    <SelectItem value="gateway">Gateway</SelectItem>
                    <SelectItem value="controller">Kontrolcü</SelectItem>
                    <SelectItem value="pump">Pompa</SelectItem>
                    <SelectItem value="doser">Dozaj Cihazı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Örn: ESP32-WROOM-32"
                />
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

