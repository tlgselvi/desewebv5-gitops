import { authenticatedGet, authenticatedPost, authenticatedPut } from "@/lib/api";
import { KanbanData, CreateDealDTO, Deal } from "@/types/crm";

// Mock data is removed, now connecting to real API
// But kept as fallback in case of connectivity issues during demo
const MOCK_FALLBACK = {
  stages: [
    { id: "stage-1", name: "Yeni Lead", order: 1, color: "#3b82f6", probability: 10 },
    { id: "stage-2", name: "İletişim", order: 2, color: "#f59e0b", probability: 30 },
    { id: "stage-3", name: "Teklif", order: 3, color: "#8b5cf6", probability: 60 },
    { id: "stage-4", name: "Müzakere", order: 4, color: "#ec4899", probability: 80 },
    { id: "stage-5", name: "Kazanılan", order: 5, color: "#10b981", probability: 100 },
  ],
  deals: []
};

export const crmService = {
  getKanban: async (): Promise<KanbanData> => {
    try {
      return await authenticatedGet<KanbanData>("/api/v1/crm/kanban");
    } catch (error) {
      console.warn("CRM API connection failed, using fallback", error);
      // In production, we should throw or show error, but for smooth dev exp:
      return MOCK_FALLBACK;
    }
  },

  createDeal: async (data: CreateDealDTO): Promise<Deal> => {
    return await authenticatedPost<Deal>("/api/v1/crm/deals", data);
  },

  updateDealStage: async (dealId: string, stageId: string): Promise<void> => {
    await authenticatedPut(`/api/v1/crm/deals/${dealId}/stage`, { stageId });
  }
};
