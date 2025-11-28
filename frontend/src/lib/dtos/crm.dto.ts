/**
 * CRM DTO (Data Transfer Object)
 * Defines the structure of CRM data in the application
 */

export type DealStage = "Lead" | "Contacted" | "Proposal" | "Closed";

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

export interface Deal {
  id: string;
  customerId: string;
  customer: Customer;
  title: string;
  value: number; // TL cinsinden
  stage: DealStage;
  contactPerson: string; // Yetkili kişi
  createdAt: string;
  updatedAt: string;
}

export interface DealStageInfo {
  id: DealStage;
  name: string;
  order: number;
}

