import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * HRBot AI Agent
 * 
 * İnsan kaynakları, bordro, performans takibi için AI desteği sağlar.
 * Google GenAI App Builder kullanır.
 */

interface PayrollCalculation {
  employeeId: string;
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  deductions: Array<{
    type: string;
    amount: number;
    percentage?: number;
  }>;
  contributions: Array<{
    type: string;
    amount: number;
    percentage?: number;
  }>;
  period: string;
}

interface PerformanceAnalysis {
  employeeId: string;
  period: string;
  overallScore: number; // 0-100
  categories: Array<{
    category: string;
    score: number;
    feedback: string;
  }>;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

interface ComplianceCheck {
  checkType: 'sgk' | 'vergi' | 'iş_kanunu' | 'genel';
  status: 'compliant' | 'warning' | 'violation';
  issues: Array<{
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  score: number; // 0-100
}

export class HRBotAgent {
  private agentId = 'hrbot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('HRBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Calculate payroll for an employee
   */
  async calculatePayroll(employeeData: {
    employeeId: string;
    baseSalary: number;
    period: string;
    overtimeHours?: number;
    overtimeRate?: number;
    bonuses?: number;
    deductions?: Array<{ type: string; amount: number }>;
  }): Promise<PayrollCalculation> {
    try {
      const prompt = `
Sen HRBot AI Agent'sın. Bordro hesaplama yap.

Çalışan Verileri:
- Çalışan ID: ${employeeData.employeeId}
- Temel Maaş: ${employeeData.baseSalary} ₺
- Dönem: ${employeeData.period}
- Mesai Saati: ${employeeData.overtimeHours || 0}
- Mesai Oranı: ${employeeData.overtimeRate || 1.5}
- Primler: ${employeeData.bonuses || 0} ₺
- Kesintiler: ${JSON.stringify(employeeData.deductions || [])}

Türkiye SGK ve vergi kurallarına göre bordro hesapla ve şu formatta JSON döndür:
{
  "employeeId": "${employeeData.employeeId}",
  "baseSalary": ${employeeData.baseSalary},
  "grossSalary": 0,
  "netSalary": 0,
  "deductions": [
    {
      "type": "SGK İşçi Payı",
      "amount": 0,
      "percentage": 14
    },
    {
      "type": "İşsizlik Sigortası İşçi Payı",
      "amount": 0,
      "percentage": 1
    },
    {
      "type": "Gelir Vergisi",
      "amount": 0
    },
    {
      "type": "Damga Vergisi",
      "amount": 0,
      "percentage": 0.00759
    }
  ],
  "contributions": [
    {
      "type": "SGK İşveren Payı",
      "amount": 0,
      "percentage": 20.5
    },
    {
      "type": "İşsizlik Sigortası İşveren Payı",
      "amount": 0,
      "percentage": 2
    }
  ],
  "period": "${employeeData.period}"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as PayrollCalculation;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen HRBot AI Agent\'sın. Bordro hesaplama uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as PayrollCalculation;
        }
      }

      // Mock response - Simplified calculation
      const overtimePay = (employeeData.overtimeHours || 0) * (employeeData.baseSalary / 30 / 8) * (employeeData.overtimeRate || 1.5);
      const grossSalary = employeeData.baseSalary + overtimePay + (employeeData.bonuses || 0);
      
      const sgkWorker = grossSalary * 0.14;
      const unemploymentWorker = grossSalary * 0.01;
      const incomeTax = grossSalary * 0.15; // Simplified
      const stampTax = grossSalary * 0.00759;
      
      const totalDeductions = sgkWorker + unemploymentWorker + incomeTax + stampTax;
      const netSalary = grossSalary - totalDeductions;

      return {
        employeeId: employeeData.employeeId,
        baseSalary: employeeData.baseSalary,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        deductions: [
          { type: 'SGK İşçi Payı', amount: Math.round(sgkWorker * 100) / 100, percentage: 14 },
          { type: 'İşsizlik Sigortası İşçi Payı', amount: Math.round(unemploymentWorker * 100) / 100, percentage: 1 },
          { type: 'Gelir Vergisi', amount: Math.round(incomeTax * 100) / 100 },
          { type: 'Damga Vergisi', amount: Math.round(stampTax * 100) / 100, percentage: 0.759 },
        ],
        contributions: [
          { type: 'SGK İşveren Payı', amount: Math.round(grossSalary * 0.205 * 100) / 100, percentage: 20.5 },
          { type: 'İşsizlik Sigortası İşveren Payı', amount: Math.round(grossSalary * 0.02 * 100) / 100, percentage: 2 },
        ],
        period: employeeData.period,
      };
    } catch (error) {
      logger.error('HRBot Agent: calculatePayroll failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze employee performance
   */
  async analyzePerformance(employeeData: {
    employeeId: string;
    period: string;
    metrics?: Array<{
      category: string;
      score: number;
      description?: string;
    }>;
  }): Promise<PerformanceAnalysis> {
    try {
      const prompt = `
Sen HRBot AI Agent'sın. Performans analizi yap.

Çalışan Verileri:
- Çalışan ID: ${employeeData.employeeId}
- Dönem: ${employeeData.period}
- Metrikler: ${JSON.stringify(employeeData.metrics || [], null, 2)}

Performans analizi yap ve şu formatta JSON döndür:
{
  "employeeId": "${employeeData.employeeId}",
  "period": "${employeeData.period}",
  "overallScore": 0-100,
  "categories": [
    {
      "category": "Kategori",
      "score": 0-100,
      "feedback": "Geri bildirim"
    }
  ],
  "strengths": ["Güçlü yön 1", "Güçlü yön 2"],
  "improvements": ["İyileştirme 1", "İyileştirme 2"],
  "recommendations": ["Öneri 1", "Öneri 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as PerformanceAnalysis;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen HRBot AI Agent\'sın. Performans analizi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as PerformanceAnalysis;
        }
      }

      // Mock response
      const metrics = employeeData.metrics || [];
      const avgScore = metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length 
        : 75;
      
      // Map metrics to categories with feedback field
      const categories = metrics.length > 0
        ? metrics.map(m => {
            let feedback: string;
            if ('description' in m && typeof m.description === 'string' && m.description) {
              feedback = m.description;
            } else if ('feedback' in m && typeof m.feedback === 'string' && m.feedback) {
              feedback = m.feedback;
            } else {
              feedback = 'İyi performans gösteriyor.';
            }
            return {
              category: m.category,
              score: m.score,
              feedback,
            };
          })
        : [
            { category: 'Genel Performans', score: 75, feedback: 'İyi performans gösteriyor.' },
          ];
      
      return {
        employeeId: employeeData.employeeId,
        period: employeeData.period,
        overallScore: Math.round(avgScore),
        categories,
        strengths: ['Düzenli çalışma', 'Takım çalışması'],
        improvements: ['Zaman yönetimi', 'İletişim becerileri'],
        recommendations: ['Eğitim programlarına katılım', 'Mentorluk desteği'],
      };
    } catch (error) {
      logger.error('HRBot Agent: analyzePerformance failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check compliance (SGK, Vergi, İş Kanunu)
   */
  async checkCompliance(checkType: 'sgk' | 'vergi' | 'iş_kanunu' | 'genel', data?: Record<string, unknown>): Promise<ComplianceCheck> {
    try {
      const prompt = `
Sen HRBot AI Agent'sın. Uyumluluk kontrolü yap.

Kontrol Tipi: ${checkType}
Veriler: ${JSON.stringify(data || {}, null, 2)}

Türkiye mevzuatına göre uyumluluk kontrolü yap ve şu formatta JSON döndür:
{
  "checkType": "${checkType}",
  "status": "compliant" | "warning" | "violation",
  "issues": [
    {
      "severity": "low" | "medium" | "high",
      "description": "Sorun açıklaması",
      "recommendation": "Öneri"
    }
  ],
  "score": 0-100
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ComplianceCheck;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen HRBot AI Agent\'sın. Uyumluluk kontrolü uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as ComplianceCheck;
        }
      }

      // Mock response
      return {
        checkType,
        status: 'compliant',
        issues: [],
        score: 95,
      };
    } catch (error) {
      logger.error('HRBot Agent: checkCompliance failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer HR questions
   */
  async answerHRQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen HRBot AI Agent'sın. İnsan kaynakları konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen HRBot AI Agent\'sın. İK konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'HRBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('HRBot Agent: answerHRQuestion failed', {
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
export const hrBotAgent = new HRBotAgent();

