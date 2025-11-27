import { authenticatedGet, authenticatedPost, authenticatedPut } from "@/lib/api";
import { KanbanData, CreateDealDTO, Deal } from "@/types/crm";

export const crmService = {
  /**
   * Kanban board verilerini getir (stages ve deals)
   */
  getKanban: async (): Promise<KanbanData> => {
    return await authenticatedGet<KanbanData>("/api/v1/crm/kanban");
  },

  createDeal: async (data: CreateDealDTO): Promise<Deal> => {
    return await authenticatedPost<Deal>("/api/v1/crm/deals", data);
  },

  updateDealStage: async (dealId: string, stageId: string): Promise<void> => {
    await authenticatedPut(`/api/v1/crm/deals/${dealId}/stage`, { stageId });
  }
};
