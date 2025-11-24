import { authenticatedGet, authenticatedPost, authenticatedPut } from "@/lib/api";
import { KanbanData, CreateDealDTO, Deal } from "@/types/crm";

// Mock data for development until backend is fully ready
const MOCK_STAGES = [
  { id: "stage-1", name: "Yeni Lead", order: 1, color: "#3b82f6", probability: 10 },
  { id: "stage-2", name: "İletişim", order: 2, color: "#f59e0b", probability: 30 },
  { id: "stage-3", name: "Teklif", order: 3, color: "#8b5cf6", probability: 60 },
  { id: "stage-4", name: "Müzakere", order: 4, color: "#ec4899", probability: 80 },
  { id: "stage-5", name: "Kazanılan", order: 5, color: "#10b981", probability: 100 },
];

const MOCK_DEALS: Deal[] = [
  { 
    id: "deal-1", 
    title: "ABC Teknoloji Lisans", 
    value: 15000, 
    currency: "TRY", 
    stageId: "stage-1", 
    status: "open",
    companyName: "ABC Teknoloji",
    updatedAt: new Date().toISOString()
  },
  { 
    id: "deal-2", 
    title: "XYZ Danışmanlık", 
    value: 45000, 
    currency: "TRY", 
    stageId: "stage-3", 
    status: "open",
    companyName: "XYZ A.Ş.",
    updatedAt: new Date().toISOString()
  },
  { 
    id: "deal-3", 
    title: "Havuz Otomasyonu", 
    value: 120000, 
    currency: "TRY", 
    stageId: "stage-4", 
    status: "open",
    companyName: "Grand Hotel",
    updatedAt: new Date().toISOString()
  },
];

export const crmService = {
  getKanban: async (): Promise<KanbanData> => {
    try {
      // Try to fetch from API
      return await authenticatedGet<KanbanData>("/api/v1/crm/kanban");
    } catch (error) {
      console.warn("CRM API not ready, using mock data");
      return {
        stages: MOCK_STAGES,
        deals: MOCK_DEALS
      };
    }
  },

  createDeal: async (data: CreateDealDTO): Promise<Deal> => {
    return await authenticatedPost<Deal>("/api/v1/crm/deals", data);
  },

  updateDealStage: async (dealId: string, stageId: string): Promise<void> => {
    await authenticatedPut(`/api/v1/crm/deals/${dealId}/stage`, { stageId });
  }
};

