import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * FinBot AI Agent
 * 
 * Finansal işlemler, nakit akışı, bütçe planlama için AI desteği sağlar.
 * Google GenAI App Builder kullanır (finansal asistan için).
 */

interface FinancialData {
  revenue?: number;
  expenses?: number;
  cashFlow?: number;
  period?: string;
  transactions?: Array<{
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
  }>;
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface Prediction {
  predictedRevenue: number;
  predictedExpenses: number;
  predictedCashFlow: number;
  confidence: number;
  reasoning: string;
  period: string;
}

interface BudgetPlan {
  totalBudget: number;
  categories: Array<{
    category: string;
    allocated: number;
    percentage: number;
  }>;
  recommendations: string[];
}

export class FinBotAgent {
  private agentId = 'finbot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('FinBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Analyze financial data and provide insights
   */
  async analyzeFinancials(data: FinancialData): Promise<AnalysisResult> {
    try {
      const prompt = `
Sen FinBot AI Agent'sın. Finansal verileri analiz et ve öngörüler sun.

Veriler:
- Gelir: ${data.revenue || 'N/A'} ₺
- Gider: ${data.expenses || 'N/A'} ₺
- Nakit Akışı: ${data.cashFlow || 'N/A'} ₺
- Dönem: ${data.period || 'N/A'}
- İşlem Sayısı: ${data.transactions?.length || 0}

Analiz yap ve şu formatta JSON döndür:
{
  "summary": "Kısa özet",
  "insights": ["Öngörü 1", "Öngörü 2"],
  "recommendations": ["Öneri 1", "Öneri 2"],
  "riskLevel": "low" | "medium" | "high"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        // Parse JSON from response
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as AnalysisResult;
        }
      }

      // Fallback to OpenAI or mock
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen FinBot AI Agent\'sın. Finansal analiz uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as AnalysisResult;
        }
      }

      // Mock response
      return {
        summary: 'Finansal veriler analiz edildi.',
        insights: ['Gelir gider dengesi normal görünüyor.'],
        recommendations: ['Nakit akışını takip etmeye devam et.'],
        riskLevel: 'low' as const,
      };
    } catch (error) {
      logger.error('FinBot Agent: analyzeFinancials failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Predict revenue for a given period
   */
  async predictRevenue(period: string = 'next month'): Promise<Prediction> {
    try {
      const prompt = `
Sen FinBot AI Agent'sın. Gelir tahmini yap.

Dönem: ${period}

Geçmiş verilere bakarak tahmin yap ve şu formatta JSON döndür:
{
  "predictedRevenue": 0,
  "predictedExpenses": 0,
  "predictedCashFlow": 0,
  "confidence": 0.0-1.0,
  "reasoning": "Tahmin gerekçesi",
  "period": "${period}"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as Prediction;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen FinBot AI Agent\'sın. Finansal tahminleme uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as Prediction;
        }
      }

      // Mock response
      return {
        predictedRevenue: 0,
        predictedExpenses: 0,
        predictedCashFlow: 0,
        confidence: 0.5,
        reasoning: 'Yeterli veri yok, tahmin yapılamadı.',
        period,
      };
    } catch (error) {
      logger.error('FinBot Agent: predictRevenue failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate budget plan
   */
  async generateBudgetPlan(totalBudget: number, categories: string[]): Promise<BudgetPlan> {
    try {
      const prompt = `
Sen FinBot AI Agent'sın. Bütçe planı oluştur.

Toplam Bütçe: ${totalBudget} ₺
Kategoriler: ${categories.join(', ')}

Bütçe planı oluştur ve şu formatta JSON döndür:
{
  "totalBudget": ${totalBudget},
  "categories": [
    {
      "category": "Kategori adı",
      "allocated": 0,
      "percentage": 0
    }
  ],
  "recommendations": ["Öneri 1", "Öneri 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as BudgetPlan;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen FinBot AI Agent\'sın. Bütçe planlama uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as BudgetPlan;
        }
      }

      // Mock response
      const perCategory = totalBudget / categories.length;
      return {
        totalBudget,
        categories: categories.map(cat => ({
          category: cat,
          allocated: perCategory,
          percentage: 100 / categories.length,
        })),
        recommendations: ['Bütçeyi düzenli olarak gözden geçir.'],
      };
    } catch (error) {
      logger.error('FinBot Agent: generateBudgetPlan failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer financial questions
   */
  async answerQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen FinBot AI Agent'sın. Finansal konularda uzman bir asistansın.

Soru: ${question}${contextStr}

Türkçe olarak detaylı ve anlaşılır bir şekilde cevap ver.
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);
        return response.response;
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen FinBot AI Agent\'sın. Finansal konularda uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'FinBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('FinBot Agent: answerQuestion failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get agent status
   */
  getStatus(): {
    agentId: string;
    enabled: boolean;
    useGenAI: boolean;
    hasOpenAI: boolean;
  } {
    return {
      agentId: this.agentId,
      enabled: true,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    };
  }
}

// Singleton instance
export const finBotAgent = new FinBotAgent();

