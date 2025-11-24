import OpenAI from 'openai';
import { logger } from '@/utils/logger.js';

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

export class JarvisService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'mock-key', // Fallback for dev/test
    });
  }

  /**
   * Analyze logs to find root cause of errors
   */
  async analyzeLogs(logs: string[]): Promise<LogAnalysisResult> {
    try {
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

      const content = response.choices[0].message.content;
      if (!content) throw new Error('Empty response from OpenAI');

      return JSON.parse(content) as LogAnalysisResult;
    } catch (error) {
      logger.error('Jarvis log analysis failed:', error);
      throw error;
    }
  }

  /**
   * Predict financial revenue for next month based on history
   */
  async predictFinancials(history: any[]): Promise<FinancialPrediction> {
     try {
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

      const content = response.choices[0].message.content;
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

      const content = response.choices[0].message.content;
      if (!content) throw new Error('Empty response from OpenAI');

      return JSON.parse(content) as LeadScore;
    } catch (error) {
      logger.error('Jarvis lead scoring failed:', error);
      throw error;
    }
  }
}

export const jarvisService = new JarvisService();

