/**
 * CRM Service
 * 
 * Handles all CRM and sales pipeline API operations.
 * Errors are properly propagated to allow React Query to handle them.
 */

import { authenticatedGet, authenticatedPost, authenticatedPut } from "@/lib/api";
import { logger } from "@/lib/logger";
import { KanbanData, CreateDealDTO, Deal } from "@/types/crm";

// =============================================================================
// SERVICE
// =============================================================================

export const crmService = {
  /**
   * Get Kanban board data (stages and deals)
   * @throws {ApiError} When request fails
   */
  getKanban: async (): Promise<KanbanData> => {
    try {
      return await authenticatedGet<KanbanData>("/api/v1/crm/kanban");
    } catch (error) {
      logger.error("Failed to fetch CRM kanban data", error);
      throw error;
    }
  },

  /**
   * Create a new deal
   * @throws {ApiError} When request fails or validation error
   */
  createDeal: async (data: CreateDealDTO): Promise<Deal> => {
    try {
      return await authenticatedPost<Deal>("/api/v1/crm/deals", data);
    } catch (error) {
      logger.error("Failed to create deal", error, { data });
      throw error;
    }
  },

  /**
   * Update deal stage (move in Kanban)
   * @throws {ApiError} When request fails
   */
  updateDealStage: async (dealId: string, stageId: string): Promise<void> => {
    try {
      await authenticatedPut(`/api/v1/crm/deals/${dealId}/stage`, { stageId });
    } catch (error) {
      logger.error("Failed to update deal stage", error, { dealId, stageId });
      throw error;
    }
  },

  /**
   * Get a single deal by ID
   * @throws {ApiError} When request fails or deal not found
   */
  getDeal: async (dealId: string): Promise<Deal> => {
    try {
      return await authenticatedGet<Deal>(`/api/v1/crm/deals/${dealId}`);
    } catch (error) {
      logger.error("Failed to fetch deal", error, { dealId });
      throw error;
    }
  },

  /**
   * Update a deal
   * @throws {ApiError} When request fails or validation error
   */
  updateDeal: async (dealId: string, data: Partial<CreateDealDTO>): Promise<Deal> => {
    try {
      return await authenticatedPut<Deal>(`/api/v1/crm/deals/${dealId}`, data);
    } catch (error) {
      logger.error("Failed to update deal", error, { dealId, data });
      throw error;
    }
  },
};

export default crmService;
