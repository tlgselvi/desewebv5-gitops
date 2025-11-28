"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal, DealStage } from "@/lib/dtos/crm.dto";
import { crmService } from "@/lib/crm-service";
import { toast } from "sonner";

interface KanbanBoardProps {
  deals: Deal[];
  onDealUpdate?: () => void;
}

const STAGES: { id: DealStage; name: string; color: string }[] = [
  { id: "Lead", name: "Yeni Aday", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { id: "Contacted", name: "Görüşülüyor", color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800" },
  { id: "Proposal", name: "Teklif Aşamasında", color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" },
  { id: "Closed", name: "Satış Kapandı", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
];

export function KanbanBoard({ deals, onDealUpdate }: KanbanBoardProps) {
  const [dealsByStage, setDealsByStage] = useState<Record<DealStage, Deal[]>>({
    Lead: [],
    Contacted: [],
    Proposal: [],
    Closed: [],
  });

  useEffect(() => {
    // Group deals by stage
    const grouped: Record<DealStage, Deal[]> = {
      Lead: [],
      Contacted: [],
      Proposal: [],
      Closed: [],
    };

    deals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    setDealsByStage(grouped);
  }, [deals]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStage = source.droppableId as DealStage;
    const destStage = destination.droppableId as DealStage;

    // Find the deal being moved
    const deal = dealsByStage[sourceStage][source.index];

    if (!deal) {
      return;
    }

    // Optimistic update
    const newDealsByStage = { ...dealsByStage };
    newDealsByStage[sourceStage] = Array.from(newDealsByStage[sourceStage]);
    newDealsByStage[sourceStage].splice(source.index, 1);

    if (sourceStage === destStage) {
      // Moving within the same column
      newDealsByStage[destStage] = Array.from(newDealsByStage[destStage]);
      newDealsByStage[destStage].splice(destination.index, 0, deal);
    } else {
      // Moving to a different column
      newDealsByStage[destStage] = Array.from(newDealsByStage[destStage]);
      newDealsByStage[destStage].splice(destination.index, 0, {
        ...deal,
        stage: destStage,
      });
    }

    setDealsByStage(newDealsByStage);

    // Update in backend
    try {
      await crmService.updateDealStage(deal.id, destStage);
      toast.success("Fırsat güncellendi");
      if (onDealUpdate) {
        onDealUpdate();
      }
    } catch (error) {
      // Revert on error
      setDealsByStage(dealsByStage);
      toast.error("Fırsat güncellenirken hata oluştu");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{stage.name}</CardTitle>
                  <Badge variant="outline" className={stage.color}>
                    {dealsByStage[stage.id].length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2">
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`h-full min-h-[200px] space-y-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? "bg-muted/50 rounded-lg"
                          : ""
                      }`}
                    >
                      {dealsByStage[stage.id].map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging
                                  ? "shadow-lg ring-2 ring-primary"
                                  : ""
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="font-semibold text-sm">
                                  {deal.customer.company || deal.customer.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {deal.title}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <span className="text-sm font-bold text-primary">
                                    {formatCurrency(deal.value)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {deal.contactPerson}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
