import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * MuBot AI Agent
 * 
 * Muhasebe kayıtları, mali tablolar, raporlama için AI desteği sağlar.
 * Google GenAI App Builder kullanır (muhasebe asistanı için).
 */

interface Transaction {
  amount: number;
  type: 'debit' | 'credit';
  account: string;
  description: string;
  date: string;
}

interface LedgerEntry {
  id: string;
  transaction: Transaction;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  date: string;
  description: string;
}

interface Report {
  type: string;
  period: string;
  data: Record<string, unknown>;
  summary: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class MuBotAgent {
  private agentId = 'mubot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('MuBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Create ledger entry from transaction
   */
  async createLedgerEntry(transaction: Transaction): Promise<LedgerEntry> {
    try {
      const prompt = `
Sen MuBot AI Agent'sın. Muhasebe uzmanısın. İşlemden yevmiye kaydı oluştur.

İşlem:
- Tutar: ${transaction.amount} ₺
- Tip: ${transaction.type}
- Hesap: ${transaction.account}
- Açıklama: ${transaction.description}
- Tarih: ${transaction.date}

Yevmiye kaydı oluştur ve şu formatta JSON döndür:
{
  "id": "unique-id",
  "transaction": { /* işlem bilgileri */ },
  "debitAccount": "Borç hesabı",
  "creditAccount": "Alacak hesabı",
  "amount": ${transaction.amount},
  "date": "${transaction.date}",
  "description": "Açıklama"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const entry = JSON.parse(jsonMatch[0]) as LedgerEntry;
          entry.id = `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return entry;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen MuBot AI Agent\'sın. Muhasebe uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const entry = JSON.parse(content) as LedgerEntry;
          entry.id = `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return entry;
        }
      }

      // Mock response
      return {
        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        transaction,
        debitAccount: transaction.type === 'debit' ? transaction.account : 'Kasa',
        creditAccount: transaction.type === 'credit' ? transaction.account : 'Kasa',
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
      };
    } catch (error) {
      logger.error('MuBot Agent: createLedgerEntry failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate financial report
   */
  async generateReport(type: string, period: string, data?: Record<string, unknown>): Promise<Report> {
    try {
      const dataStr = data ? `\n\nVeriler: ${JSON.stringify(data, null, 2)}` : '';
      const prompt = `
Sen MuBot AI Agent'sın. Mali rapor oluştur.

Rapor Tipi: ${type}
Dönem: ${period}${dataStr}

Rapor oluştur ve şu formatta JSON döndür:
{
  "type": "${type}",
  "period": "${period}",
  "data": { /* rapor verileri */ },
  "summary": "Rapor özeti"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as Report;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen MuBot AI Agent\'sın. Mali raporlama uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as Report;
        }
      }

      // Mock response
      return {
        type,
        period,
        data: data || {},
        summary: `${type} raporu ${period} dönemi için oluşturuldu.`,
      };
    } catch (error) {
      logger.error('MuBot Agent: generateReport failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer accounting questions
   */
  async answerAccountingQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen MuBot AI Agent'sın. Muhasebe konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen MuBot AI Agent\'sın. Muhasebe konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'MuBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('MuBot Agent: answerAccountingQuestion failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate transaction
   */
  async validateTransaction(transaction: Transaction): Promise<ValidationResult> {
    try {
      const prompt = `
Sen MuBot AI Agent'sın. İşlemi doğrula.

İşlem:
- Tutar: ${transaction.amount} ₺
- Tip: ${transaction.type}
- Hesap: ${transaction.account}
- Açıklama: ${transaction.description}
- Tarih: ${transaction.date}

Doğrula ve şu formatta JSON döndür:
{
  "valid": true/false,
  "errors": ["Hata 1", "Hata 2"],
  "warnings": ["Uyarı 1", "Uyarı 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ValidationResult;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen MuBot AI Agent\'sın. Muhasebe doğrulama uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as ValidationResult;
        }
      }

      // Mock validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (transaction.amount <= 0) {
        errors.push('Tutar sıfırdan büyük olmalıdır.');
      }

      if (!transaction.account) {
        errors.push('Hesap belirtilmelidir.');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('MuBot Agent: validateTransaction failed', {
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
export const muBotAgent = new MuBotAgent();

