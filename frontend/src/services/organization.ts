import { authenticatedGet, authenticatedPatch } from "@/lib/api";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string; // starter, pro, enterprise
  status: string; // active, suspended, cancelled
  users: number;
  mrr: number;
  createdAt: string;
}

export interface SystemStats {
  totalMRR: number;
  activeOrganizations: number;
  totalUsers: number;
  systemHealth: number;
}

export const organizationService = {
  /**
   * List all organizations (Super Admin)
   */
  async list(): Promise<Organization[]> {
    return await authenticatedGet<Organization[]>("/api/v1/admin/organizations");
  },

  /**
   * Get system stats
   */
  async getStats(): Promise<SystemStats> {
    return await authenticatedGet<SystemStats>("/api/v1/admin/organizations/stats");
  },

  /**
   * Update organization status
   */
  async updateStatus(id: string, status: string): Promise<Organization> {
    return await authenticatedPatch<Organization>(`/api/v1/admin/organizations/${id}/status`, { status });
  }
};

