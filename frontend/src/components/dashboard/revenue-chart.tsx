"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChartDataPoint } from "@/lib/dashboard-service";
import { useTheme } from "next-themes";

interface RevenueChartProps {
  data: RevenueChartDataPoint[];
}

/**
 * Revenue Chart Component
 * Displays revenue trend over time using an area chart
 */
export function RevenueChart({ data }: RevenueChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`rounded-lg border p-3 shadow-lg ${
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              isDark ? "text-slate-200" : "text-gray-900"
            }`}
          >
            {payload[0].payload.date}
          </p>
          <p
            className={`text-lg font-bold ${
              isDark ? "text-blue-400" : "text-blue-600"
            }`}
          >
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `₺${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₺${(value / 1000).toFixed(0)}K`;
    }
    return `₺${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Gelir Trendi</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Son 6 aylık gelir performansı
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#8884d8"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="#8884d8"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={isDark ? 0.2 : 0.3}
              stroke={isDark ? "#475569" : "#e2e8f0"}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? "#94a3b8" : "#64748b"}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={isDark ? "#94a3b8" : "#64748b"}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              dot={{ fill: "#8884d8", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

