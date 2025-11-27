import { db } from '@/db/index.js';
import { organizations, users, invoices } from '@/db/schema/index.js';
import { eq, sql, desc, and } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

export class OrganizationService {
  
  /**
   * List all organizations with stats (Super Admin)
   */
  async getAllOrganizations() {
    try {
      // Basic organization info
      const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));

      // Enrich with stats
      const result = await Promise.all(orgs.map(async (org) => {
        // User count
        const [userCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.organizationId, org.id));

        // MRR (Calculate from last month's paid invoices or estimate from tier)
        // For accurate SaaS MRR, we should look at 'subscription' type invoices. 
        // Fallback to Tier pricing if no invoices found.
        let mrr = 0;
        
        const [revenueStats] = await db
            .select({ total: sql<string>`sum(${invoices.total})` })
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, org.id),
                eq(invoices.type, 'sales'),
                eq(invoices.status, 'paid'),
                sql`${invoices.invoiceDate} > NOW() - INTERVAL '30 days'`
            ));
        
        if (revenueStats && revenueStats.total) {
            mrr = parseFloat(revenueStats.total);
        } else {
            // Fallback estimation based on tier
            switch(org.subscriptionTier) {
                case 'enterprise': mrr = 2500; break;
                case 'pro': mrr = 799; break;
                case 'starter': mrr = 299; break;
                default: mrr = 0;
            }
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.subscriptionTier,
          status: org.status,
          users: Number(userCount?.count || 0),
          mrr: mrr,
          createdAt: org.createdAt
        };
      }));

      return result;

    } catch (error) {
      logger.error('[OrganizationService] Failed to list organizations', error);
      throw error;
    }
  }

  /**
   * Get System Wide Stats (God Mode Metrics)
   */
  async getSystemStats() {
    try {
      const allOrgs = await this.getAllOrganizations();
      
      const totalMRR = allOrgs.reduce((sum, org) => sum + org.mrr, 0);
      const totalUsers = allOrgs.reduce((sum, org) => sum + org.users, 0);
      const activeOrgs = allOrgs.filter(o => o.status === 'active').length;

      return {
        totalMRR,
        activeOrganizations: activeOrgs,
        totalUsers,
        systemHealth: 99.9 // Mock for now, could be real if we hook into prometheus
      };
    } catch (error) {
      logger.error('[OrganizationService] Failed to get system stats', error);
      throw error;
    }
  }

  /**
   * Update Organization Status
   */
  async updateStatus(id: string, status: string) {
    const [updated] = await db.update(organizations)
      .set({ status, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    
    return updated;
  }
}

export const organizationService = new OrganizationService();

