import { db } from '@/db/index.js';
import { deals, contacts, activities, pipelineStages } from '@/db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface CreateDealDTO {
  organizationId: string;
  contactId?: string;
  stageId: string;
  title: string;
  value: number;
  currency?: string;
  expectedCloseDate?: Date;
  assignedTo?: string;
}

interface CreateActivityDTO {
  organizationId: string;
  dealId?: string;
  contactId?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
  createdBy: string;
}

export class CRMService {

  /**
   * Yeni Fırsat (Deal) Oluştur
   */
  async createDeal(data: CreateDealDTO) {
    // Ensure stage belongs to organization
    const stage = await db.query.pipelineStages.findFirst({
      where: and(
        eq(pipelineStages.id, data.stageId),
        eq(pipelineStages.organizationId, data.organizationId)
      )
    });

    if (!stage) throw new Error("Invalid stage or organization mismatch");

    const [newDeal] = await db.insert(deals).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      contactId: data.contactId,
      stageId: data.stageId,
      title: data.title,
      value: data.value.toFixed(2),
      currency: data.currency || 'TRY',
      expectedCloseDate: data.expectedCloseDate,
      status: 'open',
      assignedTo: data.assignedTo,
    }).returning();

    return newDeal;
  }

  /**
   * Kanban Board Verisi Getir
   * Stage'lere göre gruplanmış deal'ları döner.
   */
  async getKanbanBoard(organizationId: string) {
    // 1. Stage'leri çek
    const stages = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.organizationId, organizationId))
      .orderBy(pipelineStages.order);
    
    // If no stages exist, initialize default stages
    if (stages.length === 0) {
       return await this.initializeDefaultStages(organizationId);
    }

    // 2. Deal'ları çek
    const allDeals = await db.select({
        id: deals.id,
        title: deals.title,
        value: deals.value,
        currency: deals.currency,
        stageId: deals.stageId,
        contactName: contacts.firstName, 
        companyName: contacts.companyName,
        assignedTo: deals.assignedTo,
        updatedAt: deals.updatedAt,
        status: deals.status
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(eq(deals.organizationId, organizationId));

    // Format for frontend: { stages: [], deals: [] }
    // Frontend will do the grouping
    return {
        stages,
        deals: allDeals.map(d => ({
            ...d,
            value: Number(d.value) // Decimal to number conversion
        }))
    };
  }

  /**
   * Initialize default pipeline stages for new organizations
   */
  private async initializeDefaultStages(organizationId: string) {
    const defaults = [
        { name: "Yeni Lead", order: 1, color: "#3b82f6", probability: 10 },
        { name: "İletişim", order: 2, color: "#f59e0b", probability: 30 },
        { name: "Teklif", order: 3, color: "#8b5cf6", probability: 60 },
        { name: "Müzakere", order: 4, color: "#ec4899", probability: 80 },
        { name: "Kazanılan", order: 5, color: "#10b981", probability: 100 },
    ];

    const createdStages = await db.insert(pipelineStages).values(
        defaults.map(s => ({
            id: uuidv4(),
            organizationId,
            ...s
        }))
    ).returning();

    return {
        stages: createdStages.sort((a, b) => a.order - b.order),
        deals: []
    };
  }

  /**
   * Aktivite Ekle (Arama, Toplantı vb.)
   */
  async createActivity(data: CreateActivityDTO) {
    const [activity] = await db.insert(activities).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      dealId: data.dealId,
      contactId: data.contactId,
      type: data.type,
      subject: data.subject,
      description: data.description,
      status: 'pending',
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      createdBy: data.createdBy
    }).returning();

    return activity;
  }

  /**
   * Deal Aşamasını Güncelle (Sürükle-Bırak)
   */
  async updateDealStage(dealId: string, stageId: string, organizationId: string) {
    // Verify stage exists and belongs to org
    const stage = await db.query.pipelineStages.findFirst({
        where: and(
            eq(pipelineStages.id, stageId),
            eq(pipelineStages.organizationId, organizationId)
        )
    });

    if (!stage) throw new Error("Stage not found");

    const [updatedDeal] = await db.update(deals)
      .set({ stageId, updatedAt: new Date() })
      .where(and(eq(deals.id, dealId), eq(deals.organizationId, organizationId)))
      .returning();
    
    return updatedDeal;
  }
}

export const crmService = new CRMService();
