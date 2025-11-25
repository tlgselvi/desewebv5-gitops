import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * ServiceBot AI Agent
 * 
 * Servis yönetimi, saha yönetimi, iş emri yönetimi için AI desteği sağlar.
 * Google GenAI App Builder kullanır.
 */

interface WorkOrder {
  id: string;
  customerId: string;
  serviceType: 'maintenance' | 'repair' | 'installation' | 'inspection';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  technicianId?: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface WorkOrderOptimization {
  optimizedSchedule: Array<{
    workOrderId: string;
    technicianId: string;
    startTime: string;
    endTime: string;
    route: string[];
  }>;
  totalTime: number; // minutes
  efficiency: number; // 0-100
  recommendations: string[];
}

interface ServiceAnalysis {
  customerSatisfaction: number; // 0-100
  averageResponseTime: number; // minutes
  completionRate: number; // 0-100
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    recommendation: string;
  }>;
  recommendations: string[];
}

interface Appointment {
  id: string;
  customerId: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

interface AppointmentSuggestion {
  suggestedDate: string;
  suggestedTime: string;
  availableTechnicians: string[];
  reason: string;
}

export class ServiceBotAgent {
  private agentId = 'servicebot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('ServiceBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Optimize work order schedule
   */
  async optimizeSchedule(workOrders: WorkOrder[], technicians: Array<{ id: string; location: string }>): Promise<WorkOrderOptimization> {
    try {
      const prompt = `
Sen ServiceBot AI Agent'sın. Servis yönetimi uzmanısın. İş emri programını optimize et.

İş Emirleri:
${JSON.stringify(workOrders, null, 2)}

Teknisyenler:
${JSON.stringify(technicians, null, 2)}

Programı optimize et ve şu formatta JSON döndür:
{
  "optimizedSchedule": [
    {
      "workOrderId": "id",
      "technicianId": "id",
      "startTime": "ISO date",
      "endTime": "ISO date",
      "route": ["location1", "location2"]
    }
  ],
  "totalTime": 0,
  "efficiency": 0-100,
  "recommendations": ["Öneri 1", "Öneri 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as WorkOrderOptimization;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen ServiceBot AI Agent\'sın. Servis yönetimi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as WorkOrderOptimization;
        }
      }

      // Mock response
      return {
        optimizedSchedule: [],
        totalTime: 0,
        efficiency: 0,
        recommendations: ['Yeterli veri yok'],
      };
    } catch (error) {
      logger.error('ServiceBot Agent: optimizeSchedule failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze service performance
   */
  async analyzeServicePerformance(data: {
    workOrders: WorkOrder[];
    responseTimes: number[];
    completionRates: number[];
    customerRatings: number[];
  }): Promise<ServiceAnalysis> {
    try {
      const prompt = `
Sen ServiceBot AI Agent'sın. Servis performansı analizi yap.

Veriler:
- İş Emri Sayısı: ${data.workOrders.length}
- Ortalama Yanıt Süresi: ${data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length || 0} dakika
- Tamamlanma Oranı: ${data.completionRates.reduce((a, b) => a + b, 0) / data.completionRates.length || 0}%
- Ortalama Müşteri Puanı: ${data.customerRatings.reduce((a, b) => a + b, 0) / data.customerRatings.length || 0}/5

Analiz yap ve şu formatta JSON döndür:
{
  "customerSatisfaction": 0-100,
  "averageResponseTime": 0,
  "completionRate": 0-100,
  "issues": [
    {
      "type": "critical" | "warning" | "info",
      "message": "Sorun",
      "recommendation": "Öneri"
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
          return JSON.parse(jsonMatch[0]) as ServiceAnalysis;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen ServiceBot AI Agent\'sın. Servis performansı analizi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as ServiceAnalysis;
        }
      }

      // Mock response
      const avgRating = data.customerRatings.reduce((a, b) => a + b, 0) / data.customerRatings.length || 0;
      return {
        customerSatisfaction: (avgRating / 5) * 100,
        averageResponseTime: data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length || 0,
        completionRate: data.completionRates.reduce((a, b) => a + b, 0) / data.completionRates.length || 0,
        issues: [],
        recommendations: ['Performans iyi görünüyor'],
      };
    } catch (error) {
      logger.error('ServiceBot Agent: analyzeServicePerformance failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Suggest appointment time
   */
  async suggestAppointment(appointment: Appointment, availableTechnicians: Array<{ id: string; schedule: Array<{ date: string; time: string }> }>): Promise<AppointmentSuggestion> {
    try {
      const prompt = `
Sen ServiceBot AI Agent'sın. Randevu önerisi yap.

Randevu İsteği:
- Müşteri: ${appointment.customerId}
- Servis Tipi: ${appointment.serviceType}
- Tercih Edilen Tarih: ${appointment.preferredDate}
- Tercih Edilen Saat: ${appointment.preferredTime}
- Notlar: ${appointment.notes || 'Yok'}

Müsait Teknisyenler:
${JSON.stringify(availableTechnicians, null, 2)}

Randevu önerisi yap ve şu formatta JSON döndür:
{
  "suggestedDate": "ISO date",
  "suggestedTime": "HH:mm",
  "availableTechnicians": ["id1", "id2"],
  "reason": "Öneri gerekçesi"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as AppointmentSuggestion;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen ServiceBot AI Agent\'sın. Randevu yönetimi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as AppointmentSuggestion;
        }
      }

      // Mock response
      return {
        suggestedDate: appointment.preferredDate,
        suggestedTime: appointment.preferredTime,
        availableTechnicians: availableTechnicians.map(t => t.id),
        reason: 'Tercih edilen tarih ve saat müsait',
      };
    } catch (error) {
      logger.error('ServiceBot Agent: suggestAppointment failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer service questions
   */
  async answerServiceQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen ServiceBot AI Agent'sın. Servis yönetimi konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen ServiceBot AI Agent\'sın. Servis yönetimi konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'ServiceBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('ServiceBot Agent: answerServiceQuestion failed', {
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
export const serviceBotAgent = new ServiceBotAgent();

