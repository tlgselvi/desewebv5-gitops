"use client";

import {
  LazyLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "@/components/charts/LazyCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelemetryData } from "@/types/iot";

interface TelemetryChartProps {
  data: TelemetryData[];
  title: string;
}

export function TelemetryChart({ data, title }: TelemetryChartProps) {
  // Format data for chart
  const chartData = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  })).reverse(); // Show oldest to newest

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <LazyLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="time" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ background: "#333", border: "none", borderRadius: "8px", fontSize: "12px" }}
              itemStyle={{ color: "#fff" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Sıcaklık (°C)"
              stroke="#f59e0b" // Amber for Temp
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ph"
              name="pH"
              stroke="#3b82f6" // Blue for pH
              strokeWidth={2}
              dot={false}
            />
          </LazyLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

