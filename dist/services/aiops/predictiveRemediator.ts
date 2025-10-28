import { logger } from '../../utils/logger';
import CorrelationEngine from './correlationEngine.js';

interface MetricSnapshot {
  metric: string;
  value: number;
  timestamp: number;
  anomaly: boolean;
  anomalyScore: number;
}

interface SeverityFeatures {
  correlationScore: number;
  anomalyScore: number;
  trendDirection: number;
  remarks: string;
  metadata?: Record<string, any>;
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface SeverityPrediction {
  severity: SeverityLevel;
  confidence: number;
  reasoning: string;
  recommendedAction: string;
}

interface ActionRecommendation {
  action: string;
  priority: number;
  confidence: number;
  estimatedImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export class PredictiveRemediator {
  private correlationEngine: CorrelationEngine;
  
  // Simplified ML weights (in production, these would come from a trained model)
  private severityWeights = {
    low: { threshold: 0.3, weight: 0.2 },
    medium: { threshold: 0.5, weight: 0.4 },
    high: { threshold: 0.7, weight: 0.6 },
    critical: { threshold: 0.9, weight: 0.8 }
  };

  constructor(correlationEngine: CorrelationEngine) {
    this.correlationEngine = correlationEngine;
  }

  /**
   * Classify severity based on anomaly and correlation scores
   */
  classifySeverity(features: SeverityFeatures): SeverityPrediction {
    const { correlationScore, anomalyScore, trendDirection } = features;
    
    // Combine scores into a composite severity score
    const compositeScore = (
      correlationScore * 0.3 +
      anomalyScore * 0.4 +
      (1 - trendDirection) * 0.3
    );

    let severity: SeverityLevel;
    let confidence: number;
    let reasoning: string;
    let recommendedAction: string;

    if (compositeScore >= this.severityWeights.critical.threshold) {
      severity = SeverityLevel.CRITICAL;
      confidence = 0.95;
      reasoning = 'Critical anomaly with strong correlation detected';
      recommendedAction = 'Immediate remediation required';
      
    } else if (compositeScore >= this.severityWeights.high.threshold) {
      severity = SeverityLevel.HIGH;
      confidence = 0.85;
      reasoning = 'High severity anomaly with moderate correlation';
      recommendedAction = 'Schedule remediation within 1 hour';
      
    } else if (compositeScore >= this.severityWeights.medium.threshold) {
      severity = SeverityLevel.MEDIUM;
      confidence = 0.75;
      reasoning = 'Medium severity issue with weak correlation';
      recommendedAction = 'Monitor and plan remediation within 24 hours';
      
    } else {
      severity = SeverityLevel.LOW;
      confidence = 0.65;
      reasoning = 'Low severity inconsistency detected';
      recommendedAction = 'Continue monitoring';
    }

    // Adjust confidence based on data quality
    if (anomalyScore > 0.8 && correlationScore > 0.7) {
      confidence = Math.min(confidence + 0.1, 1.0);
      reasoning += '. High data quality indicators';
    }

    return {
      severity,
      confidence: Math.round(confidence * 1000) / 1000,
      reasoning,
      recommendedAction
    };
  }

  /**
   * Recommend actions based on correlations and severity
   */
  async recommendActions(
    targetMetric: string,
    correlatedMetrics: string[],
    severity: SeverityLevel
  ): Promise<ActionRecommendation[]> {
    const actions: ActionRecommendation[] = [];

    try {
      // Get correlation impact
      const impacts = await this.correlationEngine.predictMetricImpact(
        targetMetric,
        correlatedMetrics
      );

      // Generate actions based on severity and correlations
      for (const impact of impacts) {
        const action = this.generateActionForMetric(
          targetMetric,
          impact.metric,
          impact.correlation,
          severity
        );

        if (action) {
          actions.push(action);
        }
      }

      // Sort by priority and confidence
      actions.sort((a, b) => {
        const scoreA = a.priority * a.confidence;
        const scoreB = b.priority * b.confidence;
        return scoreB - scoreA;
      });

      // Limit to top 5 recommendations
      return actions.slice(0, 5);

    } catch (error) {
      logger.error('Error recommending actions', { error, targetMetric });
      throw error;
    }
  }

  /**
   * Generate action for a specific metric correlation
   */
  private generateActionForMetric(
    targetMetric: string,
    correlatedMetric: string,
    correlation: number,
    severity: SeverityLevel
  ): ActionRecommendation | null {
    const absCorrelation = Math.abs(correlation);
    
    // Only consider significant correlations
    if (absCorrelation < 0.3) {
      return null;
    }

    let action: string;
    let priority: number;
    let estimatedImpact: number;
    let riskLevel: 'low' | 'medium' | 'high';

    // Determine action based on metric types
    if (targetMetric.includes('latency') || targetMetric.includes('duration')) {
      action = correlation > 0 
        ? `Scale down correlated service: ${correlatedMetric}`
        : `Increase resource allocation for: ${correlatedMetric}`;
      priority = severity === SeverityLevel.CRITICAL ? 10 : 7;
      estimatedImpact = absCorrelation * 50;
      riskLevel = absCorrelation > 0.7 ? 'medium' : 'low';
      
    } else if (targetMetric.includes('error') || targetMetric.includes('failure')) {
      action = `Investigate root cause in: ${correlatedMetric}`;
      priority = severity === SeverityLevel.CRITICAL ? 10 : 8;
      estimatedImpact = absCorrelation * 60;
      riskLevel = 'high';
      
    } else if (targetMetric.includes('cpu') || targetMetric.includes('memory')) {
      action = `Optimize resource usage for: ${correlatedMetric}`;
      priority = severity === SeverityLevel.HIGH ? 8 : 6;
      estimatedImpact = absCorrelation * 40;
      riskLevel = 'low';
      
    } else {
      // Generic action
      action = `Review and optimize: ${correlatedMetric}`;
      priority = 5;
      estimatedImpact = absCorrelation * 30;
      riskLevel = 'low';
    }

    // Adjust priority based on severity
    switch (severity) {
      case SeverityLevel.CRITICAL:
        priority = 10;
        break;
      case SeverityLevel.HIGH:
        priority = Math.max(priority, 8);
        break;
      case SeverityLevel.MEDIUM:
        priority = Math.max(priority, 6);
        break;
      case SeverityLevel.LOW:
        priority = Math.max(priority, 4);
        break;
    }

    return {
      action,
      priority,
      confidence: absCorrelation,
      estimatedImpact: Math.round(estimatedImpact * 100) / 100,
      riskLevel
    };
  }

  /**
   * Calculate confidence score for action recommendations
   */
  calculateConfidence(features: SeverityFeatures): number {
    const { correlationScore, anomalyScore, trendDirection } = features;
    
    // Weighted confidence calculation
    const confidence = (
      correlationScore * 0.3 +
      anomalyScore * 0.4 +
      (1 - Math.abs(trendDirection - 0.5)) * 0.3
    );

    // Ensure confidence >= 0.5 for recommendations
    return Math.max(confidence, 0.5);
  }

  /**
   * Prioritize remediation actions
   */
  prioritizeRemediations(actions: ActionRecommendation[]): ActionRecommendation[] {
    return actions.sort((a, b) => {
      // Primary sort by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Secondary sort by confidence
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Tertiary sort by estimated impact
      return b.estimatedImpact - a.estimatedImpact;
    });
  }

  /**
   * Get remediation strategy for a metric anomaly
   */
  async getRemediationStrategy(
    targetMetric: string,
    metrics: string[],
    snapshot: MetricSnapshot
  ): Promise<{
    severity: SeverityPrediction;
    actions: ActionRecommendation[];
    timeline: string;
  }> {
    try {
      // Calculate correlation features
      const impacts = await this.correlationEngine.predictMetricImpact(
        targetMetric,
        metrics
      );

      const avgCorrelation = impacts.reduce((sum, i) => sum + Math.abs(i.correlation), 0) / impacts.length;
      const trend = snapshot.anomalyScore > 0.5 ? 0.8 : 0.2;

      const features: SeverityFeatures = {
        correlationScore: avgCorrelation,
        anomalyScore: snapshot.anomalyScore,
        trendDirection: trend
      };

      // Classify severity
      const severity = this.classifySeverity(features);

      // Recommend actions
      const actions = await this.recommendActions(
        targetMetric,
        metrics,
        severity.severity
      );

      // Prioritize actions
      const prioritizedActions = this.prioritizeRemediations(actions);

      // Determine timeline based on severity
      let timeline: string;
      switch (severity.severity) {
        case SeverityLevel.CRITICAL:
          timeline = 'Immediate (< 15 minutes)';
          break;
        case SeverityLevel.HIGH:
          timeline = 'Urgent (< 1 hour)';
          break;
        case SeverityLevel.MEDIUM:
          timeline = 'Scheduled (< 24 hours)';
          break;
        case SeverityLevel.LOW:
          timeline = 'Planned (< 1 week)';
          break;
      }

      return {
        severity,
        actions: prioritizedActions,
        timeline
      };

    } catch (error) {
      logger.error('Error getting remediation strategy', { error, targetMetric });
      throw error;
    }
  }
}

export default PredictiveRemediator;

