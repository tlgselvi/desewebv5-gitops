"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, DownloadIcon, ShieldCheck, Trash2, Filter } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// --- Helpers ---------------------------------------------------------------

const fmtDate = (d?: string | number | Date) => d ? new Date(d).toLocaleString() : "";

const toQuery = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

// A very small in-memory store to dedupe live WS events
const useEventBuffer = (max = 500) => {
  const setRef = useRef(new Set<string>());
  return {
    seen(id: string) {
      const s = setRef.current;
      if (s.has(id)) return true;
      s.add(id);
      if (s.size > max) {
        // drop oldest
        const first = s.values().next().value as string | undefined;
        if (first) s.delete(first);
      }
      return false;
    },
  };
};

// --- API hooks -------------------------------------------------------------

async function fetchAudit(filters: any) {
  const q = toQuery(filters);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/v1/audit?${q}`, { 
    credentials: "include",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
  if (!res.ok) {
    // Handle authentication errors
    if (res.status === 401 || res.status === 403) {
      // Clear invalid token
      localStorage.removeItem('token');
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Authentication required. Please login.');
    }
    
    const errorText = await res.text();
    let errorMessage = "audit_fetch_failed";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(`${errorMessage} (${res.status})`);
  }
  const json = await res.json();
  return (json.data || json) as any[];
}

async function exportMyData() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/v1/privacy/export`, { 
    method: "POST", 
    credentials: "include",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
  if (!res.ok) throw new Error("export_failed");
  return (await res.json()) as { ok: boolean; fileUrl?: string };
}

async function deleteMyData() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/v1/privacy/delete`, { 
    method: "POST", 
    credentials: "include",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
  if (!res.ok) throw new Error("delete_failed");
  return (await res.json()) as { ok: boolean };
}

async function getConsents() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/v1/privacy/consent`, { 
    credentials: "include",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
  if (!res.ok) throw new Error("consent_get_failed");
  return (await res.json()).data as Array<{ id: string; purpose: string; status: boolean; ts: string }>;
}

async function setConsent(purpose: string, status: boolean) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/v1/privacy/consent`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
    body: JSON.stringify({ purpose, status }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("consent_set_failed");
  return (await res.json()) as { ok: boolean };
}

// --- Components ------------------------------------------------------------

function AuditFilters({ onChange }: { onChange: (f: Record<string, any>) => void }) {
  const [userId, setUserId] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
      <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <Input placeholder="Resource" value={resource} onChange={(e) => setResource(e.target.value)} />
      <Input placeholder="Action" value={action} onChange={(e) => setAction(e.target.value)} />
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Any</SelectItem>
          <SelectItem value="200">200</SelectItem>
          <SelectItem value="401">401</SelectItem>
          <SelectItem value="403">403</SelectItem>
          <SelectItem value="500">500</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 opacity-60" />
        <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 opacity-60" />
        <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-6 flex gap-2">
        <Button variant="secondary" onClick={() => { setUserId(""); setResource(""); setAction(""); setStatus(""); setFrom(""); setTo(""); onChange({}); }}>
          Reset
        </Button>
        <Button onClick={() => onChange({ userId, resource, action, status, from, to })}>
          <Filter className="w-4 h-4 mr-2" /> Uygula
        </Button>
      </div>
    </div>
  );
}

function AuditTable({ rows }: { rows: any[] }) {
  return (
    <div className="w-full overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="py-2 pr-4">TS</th>
            <th className="py-2 pr-4">User</th>
            <th className="py-2 pr-4">Method</th>
            <th className="py-2 pr-4">Path</th>
            <th className="py-2 pr-4">Res</th>
            <th className="py-2 pr-4">Act</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Latency</th>
            <th className="py-2 pr-4">Trace</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b hover:bg-muted/40">
              <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.ts)}</td>
              <td className="py-2 pr-4">{r.userId ?? "-"}</td>
              <td className="py-2 pr-4">{r.method}</td>
              <td className="py-2 pr-4 max-w-[420px] truncate" title={r.path}>{r.path}</td>
              <td className="py-2 pr-4">{r.resource ?? "-"}</td>
              <td className="py-2 pr-4">{r.action ?? "-"}</td>
              <td className="py-2 pr-4"><Badge variant={r.status >= 400 ? "destructive" : "default"}>{r.status}</Badge></td>
              <td className="py-2 pr-4">{r.latencyMs} ms</td>
              <td className="py-2 pr-4">{r.traceId ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditChart({ rows }: { rows: any[] }) {
  const data = useMemo(() => {
    const buckets = new Map<string, { ts: string; ok: number; err: number }>();
    for (const r of rows) {
      const key = new Date(r.ts).toISOString().slice(0, 16); // minute bucket
      const b = buckets.get(key) ?? { ts: key, ok: 0, err: 0 };
      if (r.status >= 400) b.err += 1; else b.ok += 1;
      buckets.set(key, b);
    }
    return Array.from(buckets.values());
  }, [rows]);

  return (
    <div className="h-52">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" hide />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="ok" stroke="#16a34a" strokeWidth={2} dot={false} name="OK" />
          <Line type="monotone" dataKey="err" stroke="#dc2626" strokeWidth={2} dot={false} name="ERR" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PrivacyPanel() {
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState<Array<{ id: string; purpose: string; status: boolean; ts: string }>>([]);

  const refresh = async () => {
    try {
      const data = await getConsents();
      setConsents(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  const onExport = async () => {
    setLoading(true);
    try {
      const res = await exportMyData();
      if (res.fileUrl) window.open(res.fileUrl, "_blank");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Verilerin kalıcı olarak silinecek. Devam?")) return;
    setLoading(true);
    try {
      await deleteMyData();
      alert("Silme işlemi tetiklendi.");
    } finally { setLoading(false); }
  };

  const toggleConsent = async (purpose: string, cur: boolean) => {
    await setConsent(purpose, !cur);
    await refresh();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-1">
        <CardHeader><CardTitle>Veri İhracı</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={onExport} disabled={loading}>
            <DownloadIcon className="w-4 h-4 mr-2" /> Export JSON
          </Button>
          <p className="text-sm text-muted-foreground">Kişisel verilerinizi JSON olarak indirir.</p>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader><CardTitle>Veri Silme</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button variant="destructive" onClick={onDelete} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-2" /> Silme Talebi
          </Button>
          <p className="text-sm text-muted-foreground">Kalıcı silme işlemine başlanır. Geri alınamaz.</p>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader><CardTitle>Onay Yönetimi</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { purpose: "essential", label: "Zorunlu" },
              { purpose: "analytics", label: "Analitik" },
              { purpose: "marketing", label: "Pazarlama" },
            ].map(({ purpose, label }) => {
              const item = consents.find((c) => c.purpose === purpose);
              const enabled = !!item?.status;
              return (
                <Button key={purpose} variant={enabled ? "default" : "secondary"} onClick={() => toggleConsent(purpose, enabled)}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> {label}: {enabled ? "Açık" : "Kapalı"}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAuditPrivacy() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buffer = useEventBuffer();

  const refresh = async (f = filters) => {
    setLoading(true);
    setError(null);
    try { 
      setAuditRows(await fetchAudit(f)); 
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
      console.error('Audit fetch error:', err);
      // If it's an auth error, the fetchAudit function will redirect
      // So we don't need to show error message for auth errors
      if (err.message?.includes('Authentication required')) {
        return; // Redirect is happening
      }
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    // Live updates via WS
    let ws: WebSocket | null = null;
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${location.host.replace(':3000', ':3001')}/ws`;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const finalUrl = wsUrl.startsWith('ws') ? wsUrl : `${proto}://${location.host.replace(':3000', ':3001')}/ws`;
      ws = new WebSocket(finalUrl);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (!msg?.type) return;
          if (buffer.seen(msg.eventId || msg.id || `${msg.type}-${msg.ts}`)) return;
          // On any new event, refresh with current filters
          refresh();
        } catch {}
      };
      ws.onerror = () => {
        // Silently fail WebSocket connection
      };
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, []);

  const statusStats = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of auditRows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [auditRows]);

  return (
    <main className="p-4 md:p-6 grid gap-4">
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold">
        Admin • Audit & Privacy
      </motion.h1>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="grid gap-4">
          {error && !error.includes('Authentication required') && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Filtreler</span>
                <Button size="sm" variant="outline" onClick={() => refresh(filters)}>
                  Yenile
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditFilters onChange={(f) => { setFilters(f); refresh(f); }} />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Durum Dağılımı</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {statusStats.map(([code, count]) => (
                    <Badge key={code} variant={code >= 400 ? "destructive" : "default"}>{code}: {count}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Zaman Serisi</CardTitle></CardHeader>
              <CardContent>
                <AuditChart rows={auditRows} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Kayıtlar {loading && <span className="text-xs text-muted-foreground">yükleniyor…</span>}</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTable rows={auditRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}

