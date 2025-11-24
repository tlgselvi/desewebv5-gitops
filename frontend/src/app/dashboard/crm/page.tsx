"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { crmService } from "@/services/crm";
import { KanbanData } from "@/types/crm";
import { toast } from "sonner";

export default function CRMPage() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await crmService.getKanban();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch Kanban data", error);
      toast.error("Veriler yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate metrics
  const totalDeals = data?.deals.length || 0;
  const totalValue = data?.deals.reduce((acc, deal) => acc + deal.value, 0) || 0;
  const wonDeals = data?.deals.filter(d => d.stageId === 'stage-5').length || 0; // Assuming stage-5 is won

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM & Satış</h1>
          <p className="text-muted-foreground">
            Müşteri ilişkileri ve satış hunisi yönetimi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Yeni Fırsat
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Toplam Fırsat</div>
          <div className="text-2xl font-bold">{totalDeals}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Pipeline Değeri</div>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalValue)}
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Kazanılan</div>
          <div className="text-2xl font-bold">{wonDeals}</div>
        </div>
      </div>
      
      {/* Kanban Board Area */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-background p-4 shadow-sm">
        {isLoading && !data ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <KanbanBoard 
            initialStages={data.stages} 
            initialDeals={data.deals} 
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Veri bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
