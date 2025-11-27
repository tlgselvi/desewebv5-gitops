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
import { useCreateDevice } from "@/hooks/queries/useIoT";
import { toast } from "sonner";

interface CreateDeviceFormData {
  name: string;
  serialNumber: string;
  type: string;
  model?: string;
}

const initialFormData: CreateDeviceFormData = {
  name: "",
  serialNumber: "",
  type: "sensor",
  model: "",
};

/**
 * Dialog component for creating new IoT devices
 * Uses React Query mutation for automatic cache invalidation
 */
export function CreateDeviceDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateDeviceFormData>(initialFormData);

  // React Query mutation hook
  const createDevice = useCreateDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error("Cihaz adı zorunludur");
      return;
    }

    if (!formData.serialNumber.trim()) {
      toast.error("Seri numarası zorunludur");
      return;
    }

    // Submit using mutation
    createDevice.mutate(
      {
        name: formData.name.trim(),
        serialNumber: formData.serialNumber.trim(),
        type: formData.type,
      },
      {
        onSuccess: () => {
          // Reset form and close dialog
          setFormData(initialFormData);
          setOpen(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createDevice.isPending) {
      // Reset form when closing
      setFormData(initialFormData);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                disabled={createDevice.isPending}
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
                disabled={createDevice.isPending}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Cihaz Tipi *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={createDevice.isPending}
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
                  disabled={createDevice.isPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createDevice.isPending}
            >
              İptal
            </Button>
            <Button type="submit" disabled={createDevice.isPending}>
              {createDevice.isPending ? (
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
