'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

async function fetchRealtime() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/v1/metrics/realtime`, {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
  if (!res.ok) throw new Error('metrics_fetch_failed');
  return (await res.json()) as {
    streamStats: any[];
    ws: { connections: number; broadcastTotal: number; p50: number; p95: number };
  };
}

export default function RealtimeDashboard() {
  const [data, setData] = useState<
    { ts: number; wsConn: number; p95: number; broadcasts: number }[]
  >([]);
  const [snap, setSnap] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetchRealtime();
      setSnap(r);
      setData((d) => [
        ...d.slice(-120),
        {
          ts: Date.now(),
          wsConn: r.ws.connections,
          p95: r.ws.p95,
          broadcasts: r.ws.broadcastTotal,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch realtime metrics', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const chart = useMemo(
    () =>
      data.map((x) => ({
        ts: new Date(x.ts).toLocaleTimeString(),
        ws: x.wsConn,
        p95: x.p95,
        b: x.broadcasts,
      })),
    [data]
  );

  return (
    <main className="p-4 grid gap-4">
      <h1 className="text-2xl font-semibold">Realtime Metrics</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>WS Bağlantı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{snap?.ws.connections ?? 0}</div>
            <div className="text-sm text-muted-foreground">
              Aktif WebSocket bağlantıları
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>WS p95 RTT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{snap?.ws.p95 ?? 0} ms</div>
            <div className="text-sm text-muted-foreground">
              Son örneklerden p95
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Toplam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {snap?.ws.broadcastTotal ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Toplam yayın sayısı
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WS Zaman Serisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart
                data={chart}
                margin={{ left: 12, right: 12, top: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ws"
                  name="WS"
                  stroke="#2563eb"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="p95"
                  name="p95(ms)"
                  stroke="#dc2626"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redis Streams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-4">Stream</th>
                  <th className="py-2 pr-4">Group</th>
                  <th className="py-2 pr-4">Consumers</th>
                  <th className="py-2 pr-4">Pending</th>
                  <th className="py-2 pr-4">Lag≈</th>
                </tr>
              </thead>
              <tbody>
                {snap?.streamStats?.flatMap((s: any) =>
                  s.groups.map((g: any) => (
                    <tr key={`${s.stream}-${g.name}`} className="border-b">
                      <td className="py-2 pr-4">
                        <Badge>{s.stream}</Badge>
                      </td>
                      <td className="py-2 pr-4">{g.name}</td>
                      <td className="py-2 pr-4">{g.consumers}</td>
                      <td className="py-2 pr-4">{g.pending}</td>
                      <td className="py-2 pr-4">{g.lagApprox}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => refresh()} disabled={loading}>
          Yenile
        </Button>
      </div>
    </main>
  );
}

