"use client";

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Deal, PipelineStage } from '@/types/crm';
import { toast } from 'sonner';
import { crmService } from '@/services/crm';

interface KanbanBoardProps {
  initialStages: PipelineStage[];
  initialDeals: Deal[];
}

// --- Components ---

function SortableDealItem({ deal }: { deal: Deal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { type: 'Deal', deal } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "mb-3 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors",
        isDragging && "opacity-50 ring-2 ring-blue-500"
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="font-medium text-sm">{deal.title}</div>
        {deal.companyName && (
          <div className="text-xs text-muted-foreground">{deal.companyName}</div>
        )}
        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs font-normal">
            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: deal.currency }).format(deal.value)}
          </Badge>
          {deal.probability && (
             <span className="text-[10px] text-muted-foreground">%{deal.probability}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ stage, deals }: { stage: PipelineStage; deals: Deal[] }) {
  const { setNodeRef } = useSortable({
    id: stage.id,
    data: { type: 'Stage', stage },
    disabled: true, // Columns are not draggable in this version
  });

  const totalValue = deals.reduce((acc, deal) => acc + deal.value, 0);

  return (
    <div className="flex flex-col h-full w-72 min-w-[280px] bg-muted/30 rounded-lg border">
      <div className="p-3 border-b bg-muted/50 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: stage.color }} 
          />
          <span className="font-medium text-sm">{stage.name}</span>
          <Badge variant="secondary" className="h-5 px-1.5 min-w-[1.25rem] text-[10px]">
            {deals.length}
          </Badge>
        </div>
      </div>
      
      <div className="p-2 bg-background/50 border-b text-xs text-muted-foreground text-right">
        Toplam: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalValue)}
      </div>

      <ScrollArea className="flex-1 p-2">
        <div ref={setNodeRef} className="min-h-[100px]">
          <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {deals.map((deal) => (
              <SortableDealItem key={deal.id} deal={deal} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}

// --- Main Board ---

export function KanbanBoard({ initialStages, initialDeals }: KanbanBoardProps) {
  const [stages] = useState<PipelineStage[]>(initialStages.sort((a, b) => a.order - b.order));
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [activeDragItem, setActiveDragItem] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start dragging after 8px movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = deals.find(d => d.id === active.id);
    if (deal) setActiveDragItem(deal);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Find the container (stage) we are over
    const activeId = active.id;
    const overId = over.id;

    // If hovering over a stage container directly
    const isOverStage = stages.some(s => s.id === overId);
    
    if (isOverStage) {
       // This is handled in dragEnd usually for stage changes
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeDealId = active.id as string;
    const overId = over.id as string;

    // Find the deal being dragged
    const activeDeal = deals.find(d => d.id === activeDealId);
    if (!activeDeal) return;

    // Identify the target stage
    let targetStageId = "";

    // Case 1: Dropped over another deal
    const overDeal = deals.find(d => d.id === overId);
    if (overDeal) {
      targetStageId = overDeal.stageId;
    }
    
    // Case 2: Dropped over a stage column
    const overStage = stages.find(s => s.id === overId);
    if (overStage) {
      targetStageId = overStage.id;
    }

    // If stage hasn't changed, maybe reorder? (Reordering not implemented in backend yet)
    if (targetStageId === activeDeal.stageId || !targetStageId) {
      return;
    }

    // Optimistic Update
    const previousDeals = [...deals];
    setDeals(deals.map(d => 
      d.id === activeDealId ? { ...d, stageId: targetStageId } : d
    ));

    try {
      // API Call
      await crmService.updateDealStage(activeDealId, targetStageId);
      toast.success("Deal taşındı");
    } catch (error) {
      // Rollback
      setDeals(previousDeals);
      toast.error("Taşıma başarısız oldu");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-200px)] gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDragItem ? (
          <Card className="w-64 opacity-80 shadow-xl rotate-2 cursor-grabbing">
            <CardContent className="p-3 space-y-2">
              <div className="font-medium text-sm">{activeDragItem.title}</div>
              <div className="text-xs text-muted-foreground">Taşınıyor...</div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

