"use client";

import {
  LazyLineChart,
  LazyAreaChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ReferenceLine,
} from "@/components/charts/LazyCharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TelemetryData } from "@/types/iot";
import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Droplet,
  Thermometer,
  Waves,
  Activity,
  Battery,
  Wifi
} from "lucide-react";

interface TelemetryVisualizationProps {
  data: TelemetryData[];
  deviceName?: string;
  realTime?: boolean;
}

type TimeRange = "1h" | "24h" | "7d" | "30d";

const TIME_RANGES: Record<TimeRange, { label: string; hours: number }> = {
  "1h": { label: "Son 1 Saat", hours: 1 },
  "24h": { label: "Son 24 Saat", hours: 24 },
  "7d": { label: "Son 7 Gün", hours: 168 },
  "30d": { label: "Son 30 Gün", hours: 720 },
};

export function TelemetryVisualization({ 
  data, 
  deviceName = "Cihaz",
  realTime = false 
}: TelemetryVisualizationProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [selectedChart, setSelectedChart] = useState<"overview" | "sensors" | "metadata">("overview");

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const hours = TIME_RANGES[timeRange].hours;
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return data
      .filter(d => new Date(d.timestamp) >= cutoffTime)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit',
          ...(hours >= 24 && { day: '2-digit', month: '2-digit' })
        }),
        date: new Date(d.timestamp).toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        temperature: d.temperature ? parseFloat(d.temperature.toString()) : null,
        ph: d.ph ? parseFloat(d.ph.toString()) : null,
        chlorine: d.orp ? parseFloat(d.orp.toString()) / 100 : null, // Approximate conversion
        tds: d.tds ? parseFloat(d.tds.toString()) : null,
        flowRate: d.flowRate ? parseFloat(d.flowRate.toString()) : null,
      }));
  }, [data, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const temps = filteredData.map(d => d.temperature).filter(t => t !== null) as number[];
    const phs = filteredData.map(d => d.ph).filter(p => p !== null) as number[];
    const chlorines = filteredData.map(d => d.chlorine).filter(c => c !== null) as number[];

    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const avgPh = phs.length > 0 ? phs.reduce((a, b) => a + b, 0) / phs.length : null;
    const avgChlorine = chlorines.length > 0 ? chlorines.reduce((a, b) => a + b, 0) / chlorines.length : null;

    const latest = filteredData[filteredData.length - 1];

    // Calculate trends
    const tempTrend = temps.length >= 2 
      ? (temps[temps.length - 1] - temps[0]) / temps.length 
      : 0;
    const phTrend = phs.length >= 2 
      ? (phs[phs.length - 1] - phs[0]) / phs.length 
      : 0;

    // Check alert conditions
    const alerts: Array<{ type: string; severity: 'warning' | 'critical'; message: string }> = [];
    
    if (latest.ph !== null) {
      if (latest.ph < 6.5 || latest.ph > 8.5) {
        alerts.push({
          type: 'ph',
          severity: latest.ph < 6.0 || latest.ph > 9.0 ? 'critical' : 'warning',
          message: `pH seviyesi kritik: ${latest.ph.toFixed(2)}`
        });
      }
    }

    if (latest.temperature !== null) {
      if (latest.temperature < 10 || latest.temperature > 40) {
        alerts.push({
          type: 'temperature',
          severity: latest.temperature < 5 || latest.temperature > 45 ? 'critical' : 'warning',
          message: `Sıcaklık kritik: ${latest.temperature.toFixed(1)}°C`
        });
      }
    }

    return {
      latest: {
        temperature: latest.temperature,
        ph: latest.ph,
        chlorine: latest.chlorine,
        tds: latest.tds,
        flowRate: latest.flowRate,
      },
      average: {
        temperature: avgTemp,
        ph: avgPh,
        chlorine: avgChlorine,
      },
      trends: {
        temperature: tempTrend,
        ph: phTrend,
      },
      alerts,
    };
  }, [filteredData]);

  if (filteredData.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Telemetri Verileri</CardTitle>
          <CardDescription>Seçilen zaman aralığında veri bulunamadı.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{deviceName} - Telemetri Görselleştirme</CardTitle>
              <CardDescription>
                {realTime && (
                  <Badge variant="outline" className="mt-2">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    Canlı Veri
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_RANGES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {stats && stats.alerts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.alerts.map((alert, idx) => (
            <Card key={idx} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-red-500' : 'border-yellow-500'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${
                    alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <div>
                    <div className="font-semibold">{alert.message}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.severity === 'critical' ? 'Kritik Uyarı' : 'Uyarı'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Sıcaklık</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {stats.latest.temperature !== null 
                      ? `${stats.latest.temperature.toFixed(1)}°C`
                      : '--'}
                    {stats.trends.temperature > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : stats.trends.temperature < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                  {stats.average.temperature !== null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Ortalama: {stats.average.temperature.toFixed(1)}°C
                    </div>
                  )}
                </div>
                <Thermometer className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">pH Seviyesi</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {stats.latest.ph !== null ? stats.latest.ph.toFixed(2) : '--'}
                    {stats.trends.ph > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : stats.trends.ph < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                  {stats.average.ph !== null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Ortalama: {stats.average.ph.toFixed(2)}
                    </div>
                  )}
                </div>
                <Droplet className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Klor Seviyesi</div>
                  <div className="text-2xl font-bold">
                    {stats.latest.chlorine !== null 
                      ? `${stats.latest.chlorine.toFixed(2)} ppm`
                      : '--'}
                  </div>
                  {stats.average.chlorine !== null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Ortalama: {stats.average.chlorine.toFixed(2)} ppm
                    </div>
                  )}
                </div>
                <Waves className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">TDS</div>
                  <div className="text-2xl font-bold">
                    {stats.latest.tds !== null 
                      ? `${stats.latest.tds.toFixed(0)} ppm`
                      : '--'}
                  </div>
                  {stats.latest.flowRate !== null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Akış: {stats.latest.flowRate.toFixed(1)} L/min
                    </div>
                  )}
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs value={selectedChart} onValueChange={(value) => setSelectedChart(value as any)}>
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sensors">Sensör Detayları</TabsTrigger>
          <TabsTrigger value="metadata">Sistem Bilgileri</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sensör Değerleri - Zaman Serisi</CardTitle>
              <CardDescription>Tüm sensör okumalarının zaman içindeki değişimi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LazyAreaChart data={filteredData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: "#1f2937", 
                      border: "1px solid #374151", 
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    labelStyle={{ color: "#fff", marginBottom: "8px" }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    name="Sıcaklık (°C)"
                    stroke="#f59e0b"
                    fill="url(#tempGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="ph"
                    name="pH"
                    stroke="#3b82f6"
                    fill="url(#phGradient)"
                    strokeWidth={2}
                  />
                  <ReferenceLine yAxisId="right" y={7.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: "pH Min", position: "topRight" }} />
                  <ReferenceLine yAxisId="right" y={7.8} stroke="#10b981" strokeDasharray="3 3" label={{ value: "pH Max", position: "topRight" }} />
                </LazyAreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sıcaklık Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyLineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Sıcaklık (°C)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LazyLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>pH Seviyesi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyLineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
                    <Line
                      type="monotone"
                      dataKey="ph"
                      name="pH"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine y={7.0} stroke="#10b981" strokeDasharray="3 3" />
                    <ReferenceLine y={7.8} stroke="#10b981" strokeDasharray="3 3" />
                  </LazyLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {stats?.latest.chlorine !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Klor ve TDS Seviyeleri</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyLineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="chlorine"
                      name="Klor (ppm)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                    {stats.latest.tds !== null && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="tds"
                        name="TDS (ppm)"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </LazyLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Sistem ve Performans Metrikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Metadata görselleştirmesi için yeterli veri bulunamadı. 
                Bu bölüm gelecek güncellemelerde eklenecektir.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
