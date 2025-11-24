"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { iotService } from "@/services/iot";
import { Device, TelemetryData } from "@/types/iot";
import { DeviceCard } from "@/components/iot/device-card";
import { TelemetryChart } from "@/components/iot/telemetry-chart";
import { toast } from "sonner";

export default function IoTPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const data = await iotService.getDevices();
      setDevices(data);
      if (data.length > 0 && !selectedDevice) {
        setSelectedDevice(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch devices", error);
      toast.error("Cihazlar yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTelemetry = async (deviceId: string) => {
    try {
      const data = await iotService.getTelemetry(deviceId);
      setTelemetry(data);
    } catch (error) {
      console.error("Failed to fetch telemetry", error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchTelemetry(selectedDevice.id);
      // Polling for live data (every 5 sec)
      const interval = setInterval(() => fetchTelemetry(selectedDevice.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  // Metrics
  const activeDevices = devices.filter(d => d.status === 'online').length;
  const currentTemp = telemetry[0]?.temperature || '--';
  const currentPh = telemetry[0]?.ph || '--';

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IoT & Cihazlar</h1>
          <p className="text-muted-foreground">
            Akıllı havuz sensörleri ve cihaz yönetimi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchDevices}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Cihaz Ekle
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Aktif Cihazlar</div>
          <div className="text-2xl font-bold">{activeDevices} / {devices.length}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Anlık Sıcaklık</div>
          <div className="text-2xl font-bold text-amber-500">{currentTemp} °C</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">pH Seviyesi</div>
          <div className="text-2xl font-bold text-blue-500">{currentPh}</div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-12 flex-1">
        
        {/* Device List */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <h3 className="text-lg font-semibold">Cihaz Listesi</h3>
          {isLoading && devices.length === 0 ? (
             <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : devices.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {devices.map(device => (
                <DeviceCard 
                  key={device.id} 
                  device={device} 
                  isSelected={selectedDevice?.id === device.id}
                  onClick={setSelectedDevice}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
              Kayıtlı cihaz yok.
            </div>
          )}
        </div>

        {/* Charts & Details */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          {selectedDevice ? (
            <>
              <TelemetryChart 
                data={telemetry} 
                title={`${selectedDevice.name} - Canlı Veriler`} 
              />
              
              {/* More details could go here (Alerts, Map, Controls) */}
            </>
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
              Verilerini görmek için bir cihaz seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
