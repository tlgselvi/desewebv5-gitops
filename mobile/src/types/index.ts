/**
 * Type Definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: Date;
  citations?: Array<{
    id: string;
    source: string;
    content: string;
  }>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  source: string;
  sourceType: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardMetrics {
  revenue: number;
  expenses: number;
  activeDeals: number;
  pendingInvoices: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  timestamp: string;
}

