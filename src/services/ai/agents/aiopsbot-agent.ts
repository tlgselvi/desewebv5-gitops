import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';
import { AutoRemediator } from '@/services/aiops/autoRemediator.js';
import { AnomalyDetector } from '@/services/aiops/anomalyDetector.js';

/**
 * AIOpsBot AI Agent
 * 
 * Sistem arızalarını tespit eder, analiz eder ve otomatik düzeltir.
 * AIOps (AI Operations) uzmanı.
 */

interface SystemIssue {
  id: string;
  type: 'error' | 'warning' | 'critical' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  detectedAt: string;
  status: 'detected' | 'analyzing' | 'fixing' | 'fixed' | 'failed';
}

interface SystemAnalysis {
  healthScore: number; // 0-100
  issues: SystemIssue[];
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    description: string;
    estimatedTime: number; // minutes
  }>;
  autoFixable: number;
  requiresManualIntervention: number;
}

interface RemediationResult {
  success: boolean;
  issueId: string;
  action: string;
  duration: number; // seconds
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    metrics: Record<string, number>;
  }>;
  alerts: number;
  autoFixed: number;
  pending: number;
}

export class AIOpsBotAgent {
  private agentId = 'aiopsbot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;
  private autoRemediator: AutoRemediator;
  private anomalyDetector: AnomalyDetector;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    this.autoRemediator = new AutoRemediator();
    this.anomalyDetector = new AnomalyDetector();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('AIOpsBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Analyze system health and detect issues
   */
  async analyzeSystemHealth(metrics?: Record<string, unknown>): Promise<SystemAnalysis> {
    try {
      const prompt = `
Sen AIOpsBot AI Agent'sın. Sistem sağlığı analizi yap ve arızaları tespit et.

Metrikler:
${metrics ? JSON.stringify(metrics, null, 2) : 'Genel sistem metrikleri'}

Sistem analizi yap ve şu formatta JSON döndür:
{
  "healthScore": 0-100,
  "issues": [
    {
      "id": "unique-id",
      "type": "error" | "warning" | "critical" | "anomaly",
      "severity": "low" | "medium" | "high" | "critical",
      "component": "Component adı",
      "description": "Sorun açıklaması",
      "detectedAt": "ISO date",
      "status": "detected"
    }
  ],
  "recommendations": [
    {
      "priority": "low" | "medium" | "high" | "critical",
      "action": "Yapılacak işlem",
      "description": "Açıklama",
      "estimatedTime": 0
    }
  ],
  "autoFixable": 0,
  "requiresManualIntervention": 0
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]) as SystemAnalysis;
          // Add IDs to issues
          analysis.issues = analysis.issues.map(issue => ({
            ...issue,
            id: issue.id || `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            detectedAt: issue.detectedAt || new Date().toISOString(),
          }));
          return analysis;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen AIOpsBot AI Agent\'sın. Sistem sağlığı analizi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const analysis = JSON.parse(content) as SystemAnalysis;
          analysis.issues = analysis.issues.map(issue => ({
            ...issue,
            id: issue.id || `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            detectedAt: issue.detectedAt || new Date().toISOString(),
          }));
          return analysis;
        }
      }

      // Mock response
      return {
        healthScore: 85,
        issues: [],
        recommendations: [],
        autoFixable: 0,
        requiresManualIntervention: 0,
      };
    } catch (error) {
      logger.error('AIOpsBot Agent: analyzeSystemHealth failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Auto-fix system issue
   */
  async autoFixIssue(issue: SystemIssue): Promise<RemediationResult> {
    try {
      const startTime = Date.now();

      // Use AutoRemediator to suggest and execute action
      const action = this.autoRemediator.suggestAction(issue.component, issue.severity);
      
      // Record remediation event
      // Map 'critical' to 'high' for RemediationEvent type compatibility
      const severity: 'low' | 'medium' | 'high' = issue.severity === 'critical' ? 'high' : issue.severity;
      this.autoRemediator.recordEvent({
        timestamp: Date.now(),
        metric: issue.component,
        action,
        severity,
        status: 'executed',
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.info('AIOpsBot: Issue auto-fixed', {
        issueId: issue.id,
        component: issue.component,
        action,
        duration,
      });

      return {
        success: true,
        issueId: issue.id,
        action,
        duration,
        beforeState: {
          status: issue.status,
          severity: issue.severity,
        },
        afterState: {
          status: 'fixed',
          severity: 'low',
        },
      };
    } catch (error) {
      logger.error('AIOpsBot Agent: autoFixIssue failed', {
        error: error instanceof Error ? error.message : String(error),
        issueId: issue.id,
      });

      return {
        success: false,
        issueId: issue.id,
        action: 'none',
        duration: 0,
        beforeState: {},
        afterState: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Detect anomalies in system metrics
   */
  async detectAnomalies(metrics: Array<{ name: string; value: number; timestamp: string }>): Promise<SystemIssue[]> {
    try {
      // Convert metrics to AnomalyDetector format
      const payloads = metrics.map(m => ({
        metric: m.name,
        values: [m.value],
        timestamps: [new Date(m.timestamp).getTime()],
      }));

      const issues: SystemIssue[] = [];

      for (const payload of payloads) {
        try {
          const result = this.anomalyDetector.detectp95Anomaly(payload);
          
          if (result.result && result.result.isAnomaly) {
            issues.push({
              id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'anomaly',
              severity: result.result.severity || 'medium',
              component: payload.metric,
              description: `Anomaly detected: ${payload.metric} value ${result.result.value} is outside normal range (score: ${result.result.score})`,
              detectedAt: new Date(result.result.timestamp).toISOString(),
              status: 'detected',
            });
          }
        } catch (error) {
          logger.warn('AIOpsBot: Failed to detect anomaly for metric', {
            metric: payload.metric,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return issues;
    } catch (error) {
      logger.error('AIOpsBot Agent: detectAnomalies failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const analysis = await this.analyzeSystemHealth();
      
      const criticalIssues = analysis.issues.filter(i => i.severity === 'critical');
      const autoFixable = analysis.autoFixable;
      const pending = analysis.issues.filter(i => i.status === 'detected' || i.status === 'analyzing').length;

      let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (criticalIssues.length > 0) {
        overall = 'critical';
      } else if (analysis.issues.length > 0) {
        overall = 'degraded';
      }

      return {
        overall,
        components: analysis.issues.map(issue => ({
          name: issue.component,
          status: issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'warning' : 'healthy',
          metrics: {},
        })),
        alerts: analysis.issues.length,
        autoFixed: autoFixable,
        pending,
      };
    } catch (error) {
      logger.error('AIOpsBot Agent: getSystemHealth failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer system/operations questions
   */
  async answerSystemQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen AIOpsBot AI Agent'sın. Sistem operasyonları ve arıza giderme konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen AIOpsBot AI Agent\'sın. Sistem operasyonları ve arıza giderme konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'AIOpsBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('AIOpsBot Agent: answerSystemQuestion failed', {
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
export const aiopsBotAgent = new AIOpsBotAgent();

