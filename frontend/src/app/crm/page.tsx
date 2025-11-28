"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, RefreshCw, Loader2, Plus } from "lucide-react";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { crmService, Deal } from "@/lib/crm-service";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Activity, CircleDollarSign, CheckCircle2 } from "lucide-react";

type ViewMode = "kanban" | "list";

export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await crmService.getDeals();
      setDeals(result);
    } catch (error) {
      console.error("Failed to fetch CRM data", error);
      toast.error("Veriler yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate metrics
  const totalDeals = deals.length;
  const totalValue = deals.reduce((acc, deal) => acc + deal.value, 0);
  const closedDeals = deals.filter((d) => d.stage === "Closed").length;

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Satış & CRM</h1>
          <p className="text-muted-foreground">
            Müşteri ilişkileri ve satış hunisi yönetimi. Fırsatları takip edin ve yönetin.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="h-4 w-4 mr-1" />
              Liste
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Fırsat
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Toplam Fırsat"
          value={totalDeals}
          icon={<Activity className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Pipeline Değeri"
          value={new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0,
          }).format(totalValue)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Kazanılan Satış"
          value={closedDeals}
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-background p-4 shadow-sm">
        {isLoading && deals.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard deals={deals} onDealUpdate={fetchData} />
        ) : (
          <div className="text-center text-muted-foreground py-12">
            Liste görünümü yakında eklenecek.
          </div>
        )}
      </div>
    </div>
  );
}

