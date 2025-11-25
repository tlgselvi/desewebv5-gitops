import { db } from '@/db/index.js';
import { 
  serviceRequests, 
  technicians, 
  serviceVisits, 
  maintenancePlans, 
  maintenanceExecutions 
} from '@/db/schema/service.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';

interface CreateServiceRequestDTO {
  organizationId: string;
  contactId?: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  requestedBy?: string;
  scheduledDate?: Date;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface CreateTechnicianDTO {
  organizationId: string;
  userId: string;
  employeeNumber?: string;
  specialization?: string[];
  skillLevel?: 'junior' | 'intermediate' | 'senior' | 'expert';
  hourlyRate?: number;
}

interface CreateMaintenancePlanDTO {
  organizationId: string;
  contactId?: string;
  name: string;
  description?: string;
  planType: 'preventive' | 'corrective' | 'scheduled';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  frequencyValue?: number;
  startDate: Date;
  endDate?: Date;
  assignedTechnicianId?: string;
  estimatedDuration?: number;
  estimatedCost?: number;
  tasks?: Array<{
    id: string;
    title: string;
    description?: string;
    order: number;
  }>;
}

export class ServiceService {
  /**
   * Create a new service request
   */
  async createServiceRequest(data: CreateServiceRequestDTO) {
    try {
      // Generate request number
      const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const [request] = await db.insert(serviceRequests).values({
        id: uuidv4(),
        organizationId: data.organizationId,
        contactId: data.contactId,
        requestNumber,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        category: data.category,
        requestedBy: data.requestedBy,
        scheduledDate: data.scheduledDate,
        location: data.location,
        status: 'open',
      }).returning();

      logger.info('Service request created', {
        requestId: request.id,
        requestNumber: request.requestNumber,
        organizationId: data.organizationId,
      });

      return request;
    } catch (error) {
      logger.error('Failed to create service request', {
        error: error instanceof Error ? error.message : String(error),
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  /**
   * Get service requests by organization
   */
  async getServiceRequests(organizationId: string, filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
  }) {
    const conditions = [eq(serviceRequests.organizationId, organizationId)];

    if (filters?.status) {
      conditions.push(eq(serviceRequests.status, filters.status));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(serviceRequests.assignedTo, filters.assignedTo));
    }
    if (filters?.priority) {
      conditions.push(eq(serviceRequests.priority, filters.priority));
    }

    const requests = await db
      .select()
      .from(serviceRequests)
      .where(and(...conditions))
      .orderBy(desc(serviceRequests.createdAt));

    return requests;
  }

  /**
   * Assign technician to service request
   */
  async assignTechnician(requestId: string, technicianId: string, organizationId: string) {
    // Verify technician belongs to organization
    const technician = await db.query.technicians.findFirst({
      where: and(
        eq(technicians.id, technicianId),
        eq(technicians.organizationId, organizationId)
      ),
    });

    if (!technician) {
      throw new Error('Technician not found or organization mismatch');
    }

    const [updated] = await db
      .update(serviceRequests)
      .set({ 
        assignedTo: technicianId,
        status: 'assigned',
        updatedAt: new Date(),
      })
      .where(and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.organizationId, organizationId)
      ))
      .returning();

    return updated;
  }

  /**
   * Create technician
   */
  async createTechnician(data: CreateTechnicianDTO) {
    const [technician] = await db.insert(technicians).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      userId: data.userId,
      employeeNumber: data.employeeNumber,
      specialization: data.specialization || [],
      skillLevel: data.skillLevel || 'intermediate',
      hourlyRate: data.hourlyRate ? data.hourlyRate.toString() : null,
      availability: 'available',
      isActive: true,
    }).returning();

    logger.info('Technician created', {
      technicianId: technician.id,
      userId: data.userId,
      organizationId: data.organizationId,
    });

    return technician;
  }

  /**
   * Get technicians by organization
   */
  async getTechnicians(organizationId: string, filters?: {
    availability?: string;
    isActive?: boolean;
  }) {
    const conditions = [eq(technicians.organizationId, organizationId)];

    if (filters?.availability) {
      conditions.push(eq(technicians.availability, filters.availability));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(technicians.isActive, filters.isActive));
    }

    const techs = await db
      .select()
      .from(technicians)
      .where(and(...conditions))
      .orderBy(technicians.createdAt);

    return techs;
  }

  /**
   * Create maintenance plan
   */
  async createMaintenancePlan(data: CreateMaintenancePlanDTO) {
    // Calculate next scheduled date based on frequency
    const nextScheduledDate = this.calculateNextScheduledDate(
      data.startDate,
      data.frequency,
      data.frequencyValue
    );

    const [plan] = await db.insert(maintenancePlans).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      contactId: data.contactId,
      name: data.name,
      description: data.description,
      planType: data.planType,
      frequency: data.frequency,
      frequencyValue: data.frequencyValue,
      startDate: data.startDate,
      endDate: data.endDate,
      nextScheduledDate,
      assignedTechnicianId: data.assignedTechnicianId,
      estimatedDuration: data.estimatedDuration,
      estimatedCost: data.estimatedCost ? data.estimatedCost.toString() : null,
      tasks: data.tasks || [],
      isActive: true,
    }).returning();

    logger.info('Maintenance plan created', {
      planId: plan.id,
      organizationId: data.organizationId,
    });

    return plan;
  }

  /**
   * Get maintenance plans by organization
   */
  async getMaintenancePlans(organizationId: string, filters?: {
    isActive?: boolean;
    planType?: string;
  }) {
    const conditions = [eq(maintenancePlans.organizationId, organizationId)];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(maintenancePlans.isActive, filters.isActive));
    }
    if (filters?.planType) {
      conditions.push(eq(maintenancePlans.planType, filters.planType));
    }

    const plans = await db
      .select()
      .from(maintenancePlans)
      .where(and(...conditions))
      .orderBy(maintenancePlans.nextScheduledDate);

    return plans;
  }

  /**
   * Calculate next scheduled date based on frequency
   */
  private calculateNextScheduledDate(
    startDate: Date,
    frequency: string,
    frequencyValue?: number
  ): Date {
    const next = new Date(startDate);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + (frequencyValue || 1));
        break;
      case 'weekly':
        next.setDate(next.getDate() + (frequencyValue || 1) * 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + (frequencyValue || 1));
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + (frequencyValue || 1) * 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + (frequencyValue || 1));
        break;
      default:
        next.setDate(next.getDate() + 30); // Default to monthly
    }

    return next;
  }
}

export const serviceService = new ServiceService();

