import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * SalesBot AI Agent
 * 
 * Lead yönetimi, satış tahminleme, müşteri ilişkileri için AI desteği sağlar.
 * Google GenAI App Builder kullanır.
 */

interface LeadScoring {
  leadId: string;
  score: number; // 0-100
  factors: Array<{
    factor: string;
    weight: number;
    value: number;
  }>;
  recommendation: 'hot' | 'warm' | 'cold';
  reasoning: string;
}

interface SalesPrediction {
  period: string;
  predictedRevenue: number;
  predictedDeals: number;
  confidence: number;
  factors: string[];
  reasoning: string;
}

interface DealRecommendation {
  dealId: string;
  recommendation: 'prioritize' | 'follow_up' | 'nurture' | 'close';
  reasoning: string;
  nextSteps: string[];
  estimatedCloseDate?: string;
}

export class SalesBotAgent {
  private agentId = 'salesbot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('SalesBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Score a lead based on various factors
   */
  async scoreLead(leadData: {
    leadId: string;
    source?: string;
    industry?: string;
    companySize?: string;
    budget?: number;
    timeline?: string;
    engagement?: number;
  }): Promise<LeadScoring> {
    try {
      const prompt = `
Sen SalesBot AI Agent'sın. Lead scoring yap.

Lead Verileri:
- Lead ID: ${leadData.leadId}
- Kaynak: ${leadData.source || 'N/A'}
- Sektör: ${leadData.industry || 'N/A'}
- Şirket Büyüklüğü: ${leadData.companySize || 'N/A'}
- Bütçe: ${leadData.budget || 'N/A'} ₺
- Zaman Çizelgesi: ${leadData.timeline || 'N/A'}
- Etkileşim: ${leadData.engagement || 0}/100

Lead scoring yap ve şu formatta JSON döndür:
{
  "leadId": "${leadData.leadId}",
  "score": 0-100,
  "factors": [
    {
      "factor": "Faktör adı",
      "weight": 0.0-1.0,
      "value": 0-100
    }
  ],
  "recommendation": "hot" | "warm" | "cold",
  "reasoning": "Açıklama"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as LeadScoring;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SalesBot AI Agent\'sın. Lead scoring uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as LeadScoring;
        }
      }

      // Mock response
      const score = (leadData.budget ? 30 : 0) + (leadData.engagement || 0) * 0.7;
      return {
        leadId: leadData.leadId,
        score: Math.min(100, Math.round(score)),
        factors: [
          { factor: 'Bütçe', weight: 0.3, value: leadData.budget ? 80 : 0 },
          { factor: 'Etkileşim', weight: 0.7, value: leadData.engagement || 0 },
        ],
        recommendation: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
        reasoning: 'Lead scoring tamamlandı.',
      };
    } catch (error) {
      logger.error('SalesBot Agent: scoreLead failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Predict sales for a given period
   */
  async predictSales(period: string = 'next month', historicalData?: {
    revenue?: number[];
    deals?: number[];
  }): Promise<SalesPrediction> {
    try {
      const prompt = `
Sen SalesBot AI Agent'sın. Satış tahmini yap.

Dönem: ${period}
Geçmiş Gelir: ${historicalData?.revenue?.join(', ') || 'N/A'}
Geçmiş Deal Sayısı: ${historicalData?.deals?.join(', ') || 'N/A'}

Satış tahmini yap ve şu formatta JSON döndür:
{
  "period": "${period}",
  "predictedRevenue": 0,
  "predictedDeals": 0,
  "confidence": 0.0-1.0,
  "factors": ["Faktör 1", "Faktör 2"],
  "reasoning": "Tahmin gerekçesi"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as SalesPrediction;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SalesBot AI Agent\'sın. Satış tahminleme uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as SalesPrediction;
        }
      }

      // Mock response
      const avgRevenue = historicalData?.revenue?.reduce((a, b) => a + b, 0) / (historicalData.revenue.length || 1) || 0;
      return {
        period,
        predictedRevenue: avgRevenue,
        predictedDeals: historicalData?.deals?.reduce((a, b) => a + b, 0) / (historicalData.deals.length || 1) || 0,
        confidence: 0.6,
        factors: ['Geçmiş veriler', 'Mevsimsel trendler'],
        reasoning: 'Tahmin geçmiş verilere dayanıyor.',
      };
    } catch (error) {
      logger.error('SalesBot Agent: predictSales failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get deal recommendations
   */
  async recommendDeal(dealData: {
    dealId: string;
    value: number;
    stage: string;
    daysInStage: number;
    contactEngagement?: number;
  }): Promise<DealRecommendation> {
    try {
      const prompt = `
Sen SalesBot AI Agent'sın. Deal önerisi yap.

Deal Verileri:
- Deal ID: ${dealData.dealId}
- Değer: ${dealData.value} ₺
- Aşama: ${dealData.stage}
- Aşamada Geçen Gün: ${dealData.daysInStage}
- İletişim Etkileşimi: ${dealData.contactEngagement || 'N/A'}

Deal önerisi yap ve şu formatta JSON döndür:
{
  "dealId": "${dealData.dealId}",
  "recommendation": "prioritize" | "follow_up" | "nurture" | "close",
  "reasoning": "Açıklama",
  "nextSteps": ["Adım 1", "Adım 2"],
  "estimatedCloseDate": "YYYY-MM-DD" (opsiyonel)
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as DealRecommendation;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SalesBot AI Agent\'sın. Deal yönetimi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as DealRecommendation;
        }
      }

      // Mock response
      let recommendation: 'prioritize' | 'follow_up' | 'nurture' | 'close' = 'follow_up';
      if (dealData.stage === 'negotiation' && dealData.daysInStage < 7) {
        recommendation = 'prioritize';
      } else if (dealData.stage === 'proposal' && dealData.daysInStage > 14) {
        recommendation = 'nurture';
      }

      return {
        dealId: dealData.dealId,
        recommendation,
        reasoning: 'Deal önerisi oluşturuldu.',
        nextSteps: ['Müşteri ile iletişime geç', 'Teklifi gözden geçir'],
      };
    } catch (error) {
      logger.error('SalesBot Agent: recommendDeal failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer sales/CRM questions
   */
  async answerSalesQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen SalesBot AI Agent'sın. Satış ve CRM konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen SalesBot AI Agent\'sın. Satış ve CRM konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'SalesBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('SalesBot Agent: answerSalesQuestion failed', {
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
export const salesBotAgent = new SalesBotAgent();

