"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { IoTDashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Device } from "@/types/iot";
import { TelemetryChart } from "@/components/iot/telemetry-chart";
import { CreateDeviceDialog } from "@/components/iot/create-device-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { KPICard } from "@/components/dashboard/kpi-card";
import { useDevices, useTelemetry, useDeviceStats } from "@/hooks/queries/useIoT";

export default function IoTPage() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // React Query hooks for data fetching
  const { 
    data: devices = [], 
    isLoading, 
    isError,
    refetch,
    isRefetching 
  } = useDevices();

  const { 
    data: telemetry = [],
    isLoading: isTelemetryLoading 
  } = useTelemetry(selectedDevice?.id, {
    pollingInterval: 5000, // 5 second polling
    enabled: !!selectedDevice && showDetails,
  });

  // Get device statistics from cached data
  const stats = useDeviceStats();

  // Auto-select first device when devices load
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  // Telemetry display values
  const currentTemp = selectedDevice && telemetry[0]?.temperature 
    ? `${telemetry[0].temperature} °C` 
    : '--';
  const currentPh = selectedDevice && telemetry[0]?.ph 
    ? telemetry[0].ph.toString() 
    : '--';

  // Error state
  if (isError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center flex-col gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          Cihazlar yüklenirken bir hata oluştu.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
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
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <CreateDeviceDialog />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Toplam Cihaz"
          value={stats.total}
          icon={<Wifi className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Çevrimiçi"
          value={stats.online}
          icon={<Wifi className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-green-600"
        />
        <KPICard
          title="Çevrimdışı"
          value={stats.offline}
          icon={<WifiOff className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-gray-600"
        />
        <KPICard
          title="Hata"
          value={stats.error}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-red-600"
        />
      </div>

      {/* Main Content */}
      {showDetails && selectedDevice ? (
        /* Detail View with Charts */
        <div className="space-y-6 flex-1">
          <div className="rounded-lg border bg-background shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedDevice.name} - Canlı Veriler</h2>
              {isTelemetryLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
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
            <IoTDashboardSkeleton />
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
