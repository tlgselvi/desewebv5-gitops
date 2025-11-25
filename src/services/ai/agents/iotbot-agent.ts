import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * IoTBot AI Agent
 * 
 * IoT cihaz yönetimi, sensör verisi analizi, alarm yönetimi için AI desteği sağlar.
 * Google GenAI App Builder kullanır.
 */

interface SensorAnalysis {
  deviceId: string;
  sensorType: string;
  currentValue: number;
  normalRange: { min: number; max: number };
  status: 'normal' | 'warning' | 'critical';
  trend: 'increasing' | 'decreasing' | 'stable';
  anomalyScore: number; // 0-100
  recommendations: string[];
}

interface AlarmAnalysis {
  alarmId: string;
  deviceId: string;
  alarmType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause?: string;
  recommendedAction: string;
  estimatedImpact: string;
}

interface MaintenanceRecommendation {
  deviceId: string;
  deviceName: string;
  recommendation: 'inspection' | 'cleaning' | 'calibration' | 'repair' | 'replacement';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  estimatedCost?: number;
  nextMaintenanceDate?: string;
}

export class IoTBotAgent {
  private agentId = 'iotbot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('IoTBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Analyze sensor data
   */
  async analyzeSensor(sensorData: {
    deviceId: string;
    sensorType: string;
    currentValue: number;
    normalRange: { min: number; max: number };
    historicalValues?: number[];
  }): Promise<SensorAnalysis> {
    try {
      const prompt = `
Sen IoTBot AI Agent'sın. Sensör verisi analizi yap.

Sensör Verileri:
- Cihaz ID: ${sensorData.deviceId}
- Sensör Tipi: ${sensorData.sensorType}
- Mevcut Değer: ${sensorData.currentValue}
- Normal Aralık: ${sensorData.normalRange.min} - ${sensorData.normalRange.max}
- Geçmiş Değerler: ${sensorData.historicalValues?.join(', ') || 'N/A'}

Sensör analizi yap ve şu formatta JSON döndür:
{
  "deviceId": "${sensorData.deviceId}",
  "sensorType": "${sensorData.sensorType}",
  "currentValue": ${sensorData.currentValue},
  "normalRange": {
    "min": ${sensorData.normalRange.min},
    "max": ${sensorData.normalRange.max}
  },
  "status": "normal" | "warning" | "critical",
  "trend": "increasing" | "decreasing" | "stable",
  "anomalyScore": 0-100,
  "recommendations": ["Öneri 1", "Öneri 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as SensorAnalysis;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen IoTBot AI Agent\'sın. Sensör analizi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as SensorAnalysis;
        }
      }

      // Mock response
      const isInRange = sensorData.currentValue >= sensorData.normalRange.min && 
                       sensorData.currentValue <= sensorData.normalRange.max;
      const distanceFromMin = Math.abs(sensorData.currentValue - sensorData.normalRange.min);
      const distanceFromMax = Math.abs(sensorData.currentValue - sensorData.normalRange.max);
      const range = sensorData.normalRange.max - sensorData.normalRange.min;
      const anomalyScore = isInRange ? 0 : Math.min(100, (Math.min(distanceFromMin, distanceFromMax) / range) * 100);
      
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (anomalyScore > 50) {
        status = 'critical';
      } else if (anomalyScore > 20) {
        status = 'warning';
      }

      const historical = sensorData.historicalValues || [];
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (historical.length >= 2) {
        const recent = historical.slice(-3);
        if (recent[recent.length - 1]! > recent[0]!) {
          trend = 'increasing';
        } else if (recent[recent.length - 1]! < recent[0]!) {
          trend = 'decreasing';
        }
      }

      return {
        deviceId: sensorData.deviceId,
        sensorType: sensorData.sensorType,
        currentValue: sensorData.currentValue,
        normalRange: sensorData.normalRange,
        status,
        trend,
        anomalyScore: Math.round(anomalyScore),
        recommendations: status !== 'normal' ? ['Sensör değerini kontrol edin', 'Cihaz bakımı yapın'] : [],
      };
    } catch (error) {
      logger.error('IoTBot Agent: analyzeSensor failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze alarm and suggest actions
   */
  async analyzeAlarm(alarmData: {
    alarmId: string;
    deviceId: string;
    alarmType: string;
    value: number;
    threshold?: number;
    context?: Record<string, unknown>;
  }): Promise<AlarmAnalysis> {
    try {
      const prompt = `
Sen IoTBot AI Agent'sın. Alarm analizi yap.

Alarm Verileri:
- Alarm ID: ${alarmData.alarmId}
- Cihaz ID: ${alarmData.deviceId}
- Alarm Tipi: ${alarmData.alarmType}
- Değer: ${alarmData.value}
- Eşik: ${alarmData.threshold || 'N/A'}
- Bağlam: ${JSON.stringify(alarmData.context || {}, null, 2)}

Alarm analizi yap ve şu formatta JSON döndür:
{
  "alarmId": "${alarmData.alarmId}",
  "deviceId": "${alarmData.deviceId}",
  "alarmType": "${alarmData.alarmType}",
  "severity": "low" | "medium" | "high" | "critical",
  "rootCause": "Kök sebep (opsiyonel)",
  "recommendedAction": "Önerilen aksiyon",
  "estimatedImpact": "Tahmini etki"
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as AlarmAnalysis;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen IoTBot AI Agent\'sın. Alarm yönetimi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as AlarmAnalysis;
        }
      }

      // Mock response
      const threshold = alarmData.threshold || 0;
      const deviation = Math.abs(alarmData.value - threshold);
      const severity = deviation > threshold * 0.5 ? 'critical' :
                      deviation > threshold * 0.3 ? 'high' :
                      deviation > threshold * 0.1 ? 'medium' : 'low';

      return {
        alarmId: alarmData.alarmId,
        deviceId: alarmData.deviceId,
        alarmType: alarmData.alarmType,
        severity,
        rootCause: 'Sensör değeri normal aralığın dışında',
        recommendedAction: severity === 'critical' ? 'Acil müdahale gerekli' : 'Cihaz kontrol edilmeli',
        estimatedImpact: severity === 'critical' ? 'Yüksek' : 'Orta',
      };
    } catch (error) {
      logger.error('IoTBot Agent: analyzeAlarm failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Recommend maintenance actions
   */
  async recommendMaintenance(deviceData: {
    deviceId: string;
    deviceName: string;
    lastMaintenance?: string;
    usageHours?: number;
    errorCount?: number;
    sensorReadings?: Array<{ type: string; value: number; normal: boolean }>;
  }): Promise<MaintenanceRecommendation> {
    try {
      const prompt = `
Sen IoTBot AI Agent'sın. Bakım önerisi yap.

Cihaz Verileri:
- Cihaz ID: ${deviceData.deviceId}
- Cihaz Adı: ${deviceData.deviceName}
- Son Bakım: ${deviceData.lastMaintenance || 'N/A'}
- Kullanım Saati: ${deviceData.usageHours || 'N/A'}
- Hata Sayısı: ${deviceData.errorCount || 0}
- Sensör Okumaları: ${JSON.stringify(deviceData.sensorReadings || [], null, 2)}

Bakım önerisi yap ve şu formatta JSON döndür:
{
  "deviceId": "${deviceData.deviceId}",
  "deviceName": "${deviceData.deviceName}",
  "recommendation": "inspection" | "cleaning" | "calibration" | "repair" | "replacement",
  "urgency": "low" | "medium" | "high" | "critical",
  "reasoning": "Açıklama",
  "estimatedCost": 0 (opsiyonel),
  "nextMaintenanceDate": "YYYY-MM-DD" (opsiyonel)
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as MaintenanceRecommendation;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen IoTBot AI Agent\'sın. Bakım yönetimi uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as MaintenanceRecommendation;
        }
      }

      // Mock response
      const hasErrors = (deviceData.errorCount || 0) > 5;
      const hasAbnormalSensors = deviceData.sensorReadings?.some(s => !s.normal) || false;
      const usageHigh = (deviceData.usageHours || 0) > 1000;

      let recommendation: 'inspection' | 'cleaning' | 'calibration' | 'repair' | 'replacement' = 'inspection';
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (hasErrors || hasAbnormalSensors) {
        recommendation = 'repair';
        urgency = hasErrors ? 'critical' : 'high';
      } else if (usageHigh) {
        recommendation = 'cleaning';
        urgency = 'medium';
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (urgency === 'critical' ? 1 : urgency === 'high' ? 7 : 30));

      return {
        deviceId: deviceData.deviceId,
        deviceName: deviceData.deviceName,
        recommendation,
        urgency,
        reasoning: hasErrors ? 'Yüksek hata sayısı tespit edildi' : usageHigh ? 'Yüksek kullanım saati' : 'Rutin bakım',
        estimatedCost: recommendation === 'repair' ? 5000 : recommendation === 'replacement' ? 10000 : 500,
        nextMaintenanceDate: nextDate.toISOString().split('T')[0],
      };
    } catch (error) {
      logger.error('IoTBot Agent: recommendMaintenance failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer IoT questions
   */
  async answerIoTQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen IoTBot AI Agent'sın. IoT cihaz yönetimi konularında uzman bir asistansın.

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
            { role: 'system', content: 'Sen IoTBot AI Agent\'sın. IoT yönetimi konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'IoTBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('IoTBot Agent: answerIoTQuestion failed', {
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
export const iotBotAgent = new IoTBotAgent();

