import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * StockBot AI Agent
 * 
 * Stok yönetimi, tedarik planlama, envanter optimizasyonu için AI desteği sağlar.
 * Google GenAI App Builder kullanır.
 */

interface StockOptimization {
  productId: string;
  currentStock: number;
  recommendedStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface SupplyPlan {
  period: string;
  products: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    predictedDemand: number;
    recommendedOrder: number;
    supplier?: string;
    estimatedCost: number;
  }>;
  totalCost: number;
  recommendations: string[];
}

interface OrderRecommendation {
  productId: string;
  productName: string;
  recommendedQuantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  estimatedDeliveryDays?: number;
  supplier?: string;
}

export class StockBotAgent {
  private agentId = 'stockbot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('StockBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Optimize stock levels for a product
   */
  async optimizeStock(productData: {
    productId: string;
    productName: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    averageDailySales?: number;
    leadTime?: number; // days
  }): Promise<StockOptimization> {
    try {
      const prompt = `
Sen StockBot AI Agent'sın. Stok optimizasyonu yap.

Ürün Verileri:
- Ürün ID: ${productData.productId}
- Ürün Adı: ${productData.productName}
- Mevcut Stok: ${productData.currentStock}
- Minimum Stok: ${productData.minStock}
- Maksimum Stok: ${productData.maxStock}
- Ortalama Günlük Satış: ${productData.averageDailySales || 'N/A'}
- Teslimat Süresi: ${productData.leadTime || 'N/A'} gün

Stok optimizasyonu yap ve şu formatta JSON döndür:
{
  "productId": "${productData.productId}",
  "currentStock": ${productData.currentStock},
  "recommendedStock": 0,
  "reorderPoint": 0,
  "reorderQuantity": 0,
  "reasoning": "Açıklama",
  "urgency": "low" | "medium" | "high" | "critical"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as StockOptimization;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen StockBot AI Agent\'sın. Stok optimizasyonu uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as StockOptimization;
        }
      }

      // Mock response
      const dailySales = productData.averageDailySales || 10;
      const leadTime = productData.leadTime || 7;
      const reorderPoint = dailySales * leadTime * 1.5;
      const recommendedStock = Math.max(productData.minStock, reorderPoint * 2);
      const urgency = productData.currentStock < productData.minStock ? 'critical' :
                     productData.currentStock < reorderPoint ? 'high' :
                     productData.currentStock < recommendedStock * 0.7 ? 'medium' : 'low';

      return {
        productId: productData.productId,
        currentStock: productData.currentStock,
        recommendedStock: Math.round(recommendedStock),
        reorderPoint: Math.round(reorderPoint),
        reorderQuantity: Math.round(recommendedStock - productData.currentStock),
        reasoning: 'Stok optimizasyonu tamamlandı.',
        urgency,
      };
    } catch (error) {
      logger.error('StockBot Agent: optimizeStock failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate supply plan
   */
  async generateSupplyPlan(period: string = 'next month', products: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    minStock: number;
    averageDailySales?: number;
  }>): Promise<SupplyPlan> {
    try {
      const prompt = `
Sen StockBot AI Agent'sın. Tedarik planı oluştur.

Dönem: ${period}
Ürünler: ${JSON.stringify(products, null, 2)}

Tedarik planı oluştur ve şu formatta JSON döndür:
{
  "period": "${period}",
  "products": [
    {
      "productId": "id",
      "productName": "ad",
      "currentStock": 0,
      "predictedDemand": 0,
      "recommendedOrder": 0,
      "estimatedCost": 0
    }
  ],
  "totalCost": 0,
  "recommendations": ["Öneri 1", "Öneri 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as SupplyPlan;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen StockBot AI Agent\'sın. Tedarik planlama uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as SupplyPlan;
        }
      }

      // Mock response
      const planProducts = products.map(p => {
        const dailySales = p.averageDailySales || 10;
        const predictedDemand = dailySales * 30; // 30 günlük tahmin
        const recommendedOrder = Math.max(0, predictedDemand - p.currentStock + p.minStock);
        return {
          productId: p.productId,
          productName: p.productName,
          currentStock: p.currentStock,
          predictedDemand: Math.round(predictedDemand),
          recommendedOrder: Math.round(recommendedOrder),
          estimatedCost: recommendedOrder * 100, // Mock cost
        };
      });

      return {
        period,
        products: planProducts,
        totalCost: planProducts.reduce((sum, p) => sum + p.estimatedCost, 0),
        recommendations: ['Tedarik planı oluşturuldu', 'Siparişleri zamanında verin'],
      };
    } catch (error) {
      logger.error('StockBot Agent: generateSupplyPlan failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get order recommendations
   */
  async recommendOrder(products: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    minStock: number;
    averageDailySales?: number;
  }>): Promise<OrderRecommendation[]> {
    try {
      const prompt = `
Sen StockBot AI Agent'sın. Sipariş önerisi yap.

Ürünler: ${JSON.stringify(products, null, 2)}

Sipariş önerileri yap ve şu formatta JSON döndür:
[
  {
    "productId": "id",
    "productName": "ad",
    "recommendedQuantity": 0,
    "urgency": "low" | "medium" | "high" | "critical",
    "reasoning": "Açıklama"
  }
]
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as OrderRecommendation[];
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen StockBot AI Agent\'sın. Sipariş yönetimi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return Array.isArray(parsed) ? parsed : [parsed];
        }
      }

      // Mock response
      return products
        .filter(p => p.currentStock < p.minStock * 1.5)
        .map(p => {
          const dailySales = p.averageDailySales || 10;
          const recommendedQuantity = Math.max(p.minStock * 2 - p.currentStock, dailySales * 7);
          const urgency = p.currentStock < p.minStock ? 'critical' :
                         p.currentStock < p.minStock * 1.2 ? 'high' :
                         p.currentStock < p.minStock * 1.5 ? 'medium' : 'low';

          return {
            productId: p.productId,
            productName: p.productName,
            recommendedQuantity: Math.round(recommendedQuantity),
            urgency,
            reasoning: 'Minimum stok seviyesinin altında.',
          };
        });
    } catch (error) {
      logger.error('StockBot Agent: recommendOrder failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer inventory/stock questions
   */
  async answerStockQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen StockBot AI Agent'sın. Stok ve envanter yönetimi konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen StockBot AI Agent\'sın. Stok yönetimi konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'StockBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('StockBot Agent: answerStockQuestion failed', {
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
export const stockBotAgent = new StockBotAgent();

