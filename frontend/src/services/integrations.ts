import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from "@/lib/api";

export interface Integration {
  id: string;
  organizationId: string;
  provider: string;
  category: 'payment' | 'banking' | 'einvoice' | 'email' | 'sms' | 'whatsapp';
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  config?: Record<string, any>;
  isActive: boolean;
  isVerified: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationRequest {
  provider: string;
  category: 'payment' | 'banking' | 'einvoice' | 'email' | 'sms' | 'whatsapp';
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  config?: Record<string, any>;
}

export interface UpdateIntegrationRequest {
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  config?: Record<string, any>;
  isActive?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

/**
 * Integration Service - Frontend API client
 */
export const integrationService = {
  /**
   * Get all integrations for current organization
   */
  async list(): Promise<Integration[]> {
    return authenticatedGet<Integration[]>('/integrations');
  },

  /**
   * Get integration by ID
   */
  async getById(id: string): Promise<Integration> {
    return authenticatedGet<Integration>(`/integrations/${id}`);
  },

  /**
   * Create new integration
   */
  async create(data: CreateIntegrationRequest): Promise<Integration> {
    return authenticatedPost<Integration>('/integrations', data);
  },

  /**
   * Update integration
   */
  async update(id: string, data: UpdateIntegrationRequest): Promise<Integration> {
    return authenticatedPut<Integration>(`/integrations/${id}`, data);
  },

  /**
   * Delete integration
   */
  async delete(id: string): Promise<void> {
    await authenticatedDelete(`/integrations/${id}`);
  },

  /**
   * Test integration connection
   */
  async testConnection(id: string): Promise<TestConnectionResponse> {
    return authenticatedPost<TestConnectionResponse>(`/integrations/${id}/test`, {});
  },
};

