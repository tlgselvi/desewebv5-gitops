"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { iotService } from "@/services/iot";
import { Device, TelemetryData } from "@/types/iot";
import { TelemetryChart } from "@/components/iot/telemetry-chart";
import { toast } from "sonner";
import { CreateDeviceDialog } from "@/components/iot/create-device-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { KPICard } from "@/components/dashboard/kpi-card";

export default function IoTPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const errorDevices = devices.filter(d => d.status === 'error').length;
  const currentTemp = selectedDevice && telemetry[0]?.temperature ? `${telemetry[0].temperature} °C` : '--';
  const currentPh = selectedDevice && telemetry[0]?.ph ? telemetry[0].ph.toString() : '--';

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
          <Button 
            variant="outline" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Tablo Görünümü' : 'Detay Görünümü'}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchDevices} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <CreateDeviceDialog onSuccess={fetchDevices} />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Toplam Cihaz"
          value={totalDevices}
          icon={<Wifi className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Çevrimiçi"
          value={onlineDevices}
          icon={<Wifi className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-green-600"
        />
        <KPICard
          title="Çevrimdışı"
          value={offlineDevices}
          icon={<WifiOff className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-gray-600"
        />
        <KPICard
          title="Hata"
          value={errorDevices}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-red-600"
        />
      </div>

      {showDetails && selectedDevice ? (
        /* Detail View with Charts */
        <div className="space-y-6 flex-1">
          <div className="rounded-lg border bg-background shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">{selectedDevice.name} - Canlı Veriler</h2>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
                <div className="text-sm font-medium text-muted-foreground">Anlık Sıcaklık</div>
                <div className="text-2xl font-bold text-amber-500">{currentTemp}</div>
              </div>
              <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
                <div className="text-sm font-medium text-muted-foreground">pH Seviyesi</div>
                <div className="text-2xl font-bold text-blue-500">{currentPh}</div>
              </div>
            </div>
            <TelemetryChart 
              data={telemetry} 
              title={`${selectedDevice.name} - Telemetri Verileri`} 
            />
          </div>
        </div>
      ) : (
        /* DataTable View */
        <div className="flex-1 overflow-hidden rounded-lg border bg-background shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={devices} 
              searchKey="name" 
              searchPlaceholder="Cihaz adı veya seri no ile ara..."
              onRowClick={(device) => {
                setSelectedDevice(device);
                setShowDetails(true);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
