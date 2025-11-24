export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  probability: number;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  contactName?: string;
  companyName?: string;
  stageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  assignedTo?: string;
  expectedCloseDate?: string;
  updatedAt: string;
}

export interface KanbanData {
  stages: PipelineStage[];
  deals: Deal[];
}

export interface CreateDealDTO {
  title: string;
  value: number;
  stageId: string;
  contactId?: string;
  description?: string;
}

