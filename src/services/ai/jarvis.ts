import OpenAI from 'openai';
import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from './genai-app-builder.js';
import { config } from '@/config/index.js';
import { finBotAgent, muBotAgent, seoBotAgent, serviceBotAgent, salesBotAgent, stockBotAgent, hrBotAgent, iotBotAgent, aiopsBotAgent, procurementBotAgent } from './agents/index.js';
import { agentCommunication, AgentId, AgentMessage } from './agent-communication.js';

interface LogAnalysisResult {
  rootCause: string;
  solution: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface FinancialPrediction {
  predictedRevenue: number;
  confidence: number;
  reasoning: string;
}

interface LeadScore {
  score: number; // 0-100
  category: 'cold' | 'warm' | 'hot';
  explanation: string;
}

interface AgentStatus {
  agentId: AgentId;
  enabled: boolean;
  status: 'online' | 'offline' | 'error' | 'processing';
  lastActivity?: string;
  messageCount?: number;
  errorRate?: number;
  responseTime?: number;
}

interface DailySummary {
  date: string;
  financials: {
    revenue: number;
    expenses: number;
    cashFlow: number;
  };
  sales: {
    newLeads: number;
    dealsWon: number;
    pipelineValue: number;
  };
  operations: {
    invoicesCreated: number;
    transactionsProcessed: number;
    alertsGenerated: number;
  };
  recommendations: string[];
  alerts: string[];
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: AgentId;
  timestamp: string;
  resolved: boolean;
}

interface Recommendation {
  id: string;
  type: 'financial' | 'operational' | 'strategic';
  message: string;
  priority: 'low' | 'medium' | 'high';
  source: AgentId;
  timestamp: string;
}

export class JarvisService {
  private client: OpenAI;
  private useGenAI: boolean;
  private agents: Map<AgentId, { status: AgentStatus; lastCheck: Date }> = new Map();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'mock-key', // Fallback for dev/test
    });
    // Use GenAI App Builder if enabled, otherwise fallback to OpenAI
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (this.useGenAI) {
      logger.info('JARVIS: Using Google GenAI App Builder (trial credits)');
    } else {
      logger.info('JARVIS: Using OpenAI (fallback)');
    }

    // Initialize agent status tracking
    this.initializeAgents();
  }

  /**
   * Initialize agent status tracking
   */
  private initializeAgents(): void {
    const agentIds: AgentId[] = ['finbot', 'mubot', 'salesbot', 'stockbot', 'hrbot', 'iotbot', 'seobot', 'servicebot', 'aiopsbot', 'procurementbot'];
    
    for (const agentId of agentIds) {
      this.agents.set(agentId, {
        status: {
          agentId,
          enabled: true,
          status: 'online',
        },
        lastCheck: new Date(),
      });
    }

    logger.info('JARVIS: Agent status tracking initialized', {
      agentCount: this.agents.size,
    });
  }

  /**
   * Analyze logs to find root cause of errors
   * Uses GenAI App Builder if enabled, otherwise falls back to OpenAI
   */
  async analyzeLogs(logs: string[]): Promise<LogAnalysisResult> {
    try {
      // Try GenAI App Builder first if enabled
      if (this.useGenAI) {
        try {
          const prompt = `
You are JARVIS, an AIOps expert. Analyze the following logs and identify the root cause of the error.
Provide a solution and estimate the severity.

Logs:
${logs.join('\n')}

Output JSON format:
{
  "rootCause": "string",
  "solution": "string",
  "severity": "low" | "medium" | "high" | "critical"
}
`;

          const response = await genAIAppBuilderService.chat([
            { role: 'user', content: prompt }
          ]);

          // Parse JSON from response
          const jsonMatch = response.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as LogAnalysisResult;
          }
        } catch (genAIError) {
          logger.warn('GenAI App Builder failed, falling back to OpenAI', {
            error: genAIError instanceof Error ? genAIError.message : String(genAIError),
          });
        }
      }

      // Fallback to OpenAI
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not found, returning mock analysis');
        return {
          rootCause: 'Mock analysis: Database connection timeout detected.',
          solution: 'Check database connection pool settings.',
          severity: 'medium'
        };
      }

      const prompt = `
        You are JARVIS, an AIOps expert. Analyze the following logs and identify the root cause of the error.
        Provide a solution and estimate the severity.

        Logs:
        ${logs.join('\n')}

        Output JSON format:
        {
          "rootCause": "string",
          "solution": "string",
          "severity": "low" | "medium" | "high" | "critical"
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      return JSON.parse(content) as LogAnalysisResult;
    } catch (error) {
      logger.error('Jarvis log analysis failed:', error);
      throw error;
    }
  }

  /**
   * Predict financial revenue for next month based on history
   * Uses GenAI App Builder for financial insights if enabled
   */
  async predictFinancials(history: any[]): Promise<FinancialPrediction> {
     try {
      // Try GenAI App Builder first if enabled
      if (this.useGenAI) {
        try {
          const insights = await genAIAppBuilderService.generateFinancialInsights({
            history,
            task: 'predict_revenue',
          });

          // Extract prediction from insights
          const prompt = `
Based on the following financial analysis, extract the revenue prediction:

${insights}

Output JSON format:
{
  "predictedRevenue": number,
  "confidence": number (0-1),
  "reasoning": "string"
}
`;

          const response = await genAIAppBuilderService.chat([
            { role: 'user', content: prompt }
          ]);

          const jsonMatch = response.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as FinancialPrediction;
          }
        } catch (genAIError) {
          logger.warn('GenAI App Builder failed, falling back to OpenAI', {
            error: genAIError instanceof Error ? genAIError.message : String(genAIError),
          });
        }
      }

      // Fallback to OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return {
          predictedRevenue: 150000,
          confidence: 0.85,
          reasoning: 'Mock prediction based on linear growth.'
        };
      }

      const prompt = `
        You are JARVIS, a Financial Analyst. Analyze the historical revenue data and predict next month's revenue.
        
        History:
        ${JSON.stringify(history)}

        Output JSON format:
        {
          "predictedRevenue": number,
          "confidence": number (0-1),
          "reasoning": "string"
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      return JSON.parse(content) as FinancialPrediction;
    } catch (error) {
      logger.error('Jarvis financial prediction failed:', error);
      throw error;
    }
  }

  /**
   * Score a lead based on profile and activity
   */
  async scoreLead(leadData: any): Promise<LeadScore> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return {
          score: 75,
          category: 'warm',
          explanation: 'Mock score: Good industry match.'
        };
      }

      const prompt = `
        You are JARVIS, a Sales Expert. Score this lead from 0 to 100 based on conversion probability.
        
        Lead Data:
        ${JSON.stringify(leadData)}

        Output JSON format:
        {
          "score": number,
          "category": "cold" | "warm" | "hot",
          "explanation": "string"
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      return JSON.parse(content) as LeadScore;
    } catch (error) {
      logger.error('Jarvis lead scoring failed:', error);
      throw error;
    }
  }

  // ========== Multi-Agent Coordinator Methods ==========

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: AgentId): Promise<{
    agentId: AgentId;
    enabled: boolean;
    status: 'online' | 'offline' | 'error' | 'processing';
    lastActivity?: string;
    messageCount?: number;
  }> {
    try {
      let status: {
        agentId: AgentId;
        enabled: boolean;
        status: 'online' | 'offline' | 'error' | 'processing';
        lastActivity?: string;
        messageCount?: number;
      } = {
        agentId,
        enabled: true,
        status: 'online',
      };
      
      if (agentId === 'finbot') {
        const finBotStatus = finBotAgent.getStatus();
        status.enabled = finBotStatus.enabled;
        status.status = finBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'mubot') {
        const muBotStatus = muBotAgent.getStatus();
        status.enabled = muBotStatus.enabled;
        status.status = muBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'seobot') {
        const seoBotStatus = seoBotAgent.getStatus();
        status.enabled = seoBotStatus.enabled;
        status.status = seoBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'servicebot') {
        const serviceBotStatus = serviceBotAgent.getStatus();
        status.enabled = serviceBotStatus.enabled;
        status.status = serviceBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'salesbot') {
        const salesBotStatus = salesBotAgent.getStatus();
        status.enabled = salesBotStatus.enabled;
        status.status = salesBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'stockbot') {
        const stockBotStatus = stockBotAgent.getStatus();
        status.enabled = stockBotStatus.enabled;
        status.status = stockBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'hrbot') {
        const hrBotStatus = hrBotAgent.getStatus();
        status.enabled = hrBotStatus.enabled;
        status.status = hrBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'iotbot') {
        const iotBotStatus = iotBotAgent.getStatus();
        status.enabled = iotBotStatus.enabled;
        status.status = iotBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'aiopsbot') {
        const aiopsBotStatus = aiopsBotAgent.getStatus();
        status.enabled = aiopsBotStatus.enabled;
        status.status = aiopsBotStatus.enabled ? 'online' : 'offline';
      } else if (agentId === 'procurementbot') {
        const procurementBotStatus = procurementBotAgent.getStatus();
        status.enabled = procurementBotStatus.enabled;
        status.status = procurementBotStatus.enabled ? 'online' : 'offline';
      }

      // Get stream info
      const streamInfo = await agentCommunication.getStreamInfo(agentId);
      status.messageCount = streamInfo.length;
      if (streamInfo.lastMessageId) {
        status.lastActivity = streamInfo.lastMessageId;
      }

      return status;
    } catch (error) {
      logger.error('JARVIS: Failed to get agent status', {
        error: error instanceof Error ? error.message : String(error),
        agentId,
      });
      return {
        agentId,
        enabled: false,
        status: 'error',
      };
    }
  }

  /**
   * Get all agents status
   */
  async getAllAgentsStatus(): Promise<Record<AgentId, {
    agentId: AgentId;
    enabled: boolean;
    status: 'online' | 'offline' | 'error' | 'processing';
    lastActivity?: string;
    messageCount?: number;
  }>> {
    const agentIds: AgentId[] = ['finbot', 'mubot', 'salesbot', 'stockbot', 'hrbot', 'iotbot', 'seobot', 'servicebot', 'aiopsbot', 'procurementbot'];
    const statuses: Record<string, {
      agentId: AgentId;
      enabled: boolean;
      status: 'online' | 'offline' | 'error' | 'processing';
      lastActivity?: string;
      messageCount?: number;
    }> = {};

    for (const agentId of agentIds) {
      statuses[agentId] = await this.getAgentStatus(agentId);
    }

    return statuses as Record<AgentId, {
      agentId: AgentId;
      enabled: boolean;
      status: 'online' | 'offline' | 'error' | 'processing';
      lastActivity?: string;
      messageCount?: number;
    }>;
  }

  /**
   * Answer user question (coordinate with agents)
   */
  async answerUserQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const questionLower = question.toLowerCase();
      let targetAgent: AgentId | null = null;

      if (questionLower.includes('gelir') || questionLower.includes('gider') || questionLower.includes('bütçe') || questionLower.includes('nakit')) {
        targetAgent = 'finbot';
      } else if (questionLower.includes('muhasebe') || questionLower.includes('yevmiye') || questionLower.includes('rapor')) {
        targetAgent = 'mubot';
      } else if (questionLower.includes('seo') || questionLower.includes('içerik') || questionLower.includes('keyword') || questionLower.includes('arama')) {
        targetAgent = 'seobot';
      } else if (questionLower.includes('servis') || questionLower.includes('saha') || questionLower.includes('teknisyen') || questionLower.includes('randevu') || questionLower.includes('iş emri')) {
        targetAgent = 'servicebot';
      } else if (questionLower.includes('satış') || questionLower.includes('lead') || questionLower.includes('müşteri') || questionLower.includes('deal') || questionLower.includes('crm')) {
        targetAgent = 'salesbot';
      } else if (questionLower.includes('stok') || questionLower.includes('envanter') || questionLower.includes('sipariş') || questionLower.includes('ürün')) {
        targetAgent = 'stockbot';
      } else if (questionLower.includes('satın alma') || questionLower.includes('procurement') || questionLower.includes('rfq') || questionLower.includes('purchase order') || questionLower.includes('tedarikçi')) {
        targetAgent = 'procurementbot';
      } else if (questionLower.includes('bordro') || questionLower.includes('çalışan') || questionLower.includes('performans') || questionLower.includes('sgk') || questionLower.includes('ik') || questionLower.includes('insan kaynak')) {
        targetAgent = 'hrbot';
      } else if (questionLower.includes('iot') || questionLower.includes('sensör') || questionLower.includes('cihaz') || questionLower.includes('alarm') || questionLower.includes('havuz')) {
        targetAgent = 'iotbot';
      } else if (questionLower.includes('sistem') || questionLower.includes('arıza') || questionLower.includes('hata') || questionLower.includes('düzelt') || questionLower.includes('anomali') || questionLower.includes('sağlık')) {
        targetAgent = 'aiopsbot';
      }

      if (targetAgent) {
        const response = await agentCommunication.sendQuery(
          'jarvis',
          targetAgent,
          { question, context },
          30000
        );

        if (response && response.data.answer) {
          return response.data.answer as string;
        }
      }

      // Fallback to JARVIS's own AI
      const prompt = `Sen JARVIS'sin. Master coordinator AI agent'sın. Kullanıcının sorusunu cevapla.\n\nSoru: ${question}${context ? `\nBağlam: ${JSON.stringify(context, null, 2)}` : ''}\n\nTürkçe olarak detaylı ve anlaşılır bir şekilde cevap ver.`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);
        return response.response;
      }

      if (process.env.OPENAI_API_KEY) {
        const completion = await this.client.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen JARVIS\'sin. Master coordinator AI agent\'sın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });
        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'JARVIS şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('JARVIS: Failed to answer user question', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const jarvisService = new JarvisService();

