/**
 * Incident Response Service
 * 
 * Handles alerting integrations (Slack, PagerDuty, Webhook)
 * @module services/monitoring/incident-response
 */

import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Alert channel types
 */
export type AlertChannel = 'slack' | 'pagerduty' | 'webhook' | 'email';

/**
 * Incident details
 */
export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  source: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  runbookUrl?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

/**
 * Alert channel configuration
 */
export interface AlertChannelConfig {
  type: AlertChannel;
  enabled: boolean;
  url?: string;
  token?: string;
  channel?: string;
  minSeverity?: IncidentSeverity;
}

/**
 * Escalation policy
 */
export interface EscalationPolicy {
  name: string;
  steps: EscalationStep[];
}

export interface EscalationStep {
  delayMinutes: number;
  channels: AlertChannel[];
  notifyUsers?: string[];
}

// Severity to numeric value for comparison
const severityLevels: Record<IncidentSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Incident Response Service
 */
class IncidentResponseService {
  private channels: Map<AlertChannel, AlertChannelConfig> = new Map();
  private activeIncidents: Map<string, Incident> = new Map();
  private escalationPolicy?: EscalationPolicy;
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeChannels();
  }

  /**
   * Initialize alert channels from environment
   */
  private initializeChannels(): void {
    // Slack integration
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.set('slack', {
        type: 'slack',
        enabled: true,
        url: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
        minSeverity: (process.env.SLACK_MIN_SEVERITY as IncidentSeverity) || 'medium',
      });
      logger.info('Slack alert channel configured');
    }

    // PagerDuty integration
    if (process.env.PAGERDUTY_ROUTING_KEY) {
      this.channels.set('pagerduty', {
        type: 'pagerduty',
        enabled: true,
        token: process.env.PAGERDUTY_ROUTING_KEY,
        minSeverity: 'high',
      });
      logger.info('PagerDuty alert channel configured');
    }

    // Generic webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.set('webhook', {
        type: 'webhook',
        enabled: true,
        url: process.env.ALERT_WEBHOOK_URL,
        token: process.env.ALERT_WEBHOOK_TOKEN,
      });
      logger.info('Webhook alert channel configured');
    }

    // Default escalation policy
    this.escalationPolicy = {
      name: 'default',
      steps: [
        {
          delayMinutes: 0,
          channels: ['slack', 'webhook'],
        },
        {
          delayMinutes: 5,
          channels: ['pagerduty'],
        },
        {
          delayMinutes: 15,
          channels: ['pagerduty'],
          notifyUsers: process.env.ONCALL_USERS?.split(','),
        },
      ],
    };
  }

  /**
   * Create and send an incident alert
   */
  async createIncident(incident: Omit<Incident, 'id' | 'timestamp'>): Promise<Incident> {
    const fullIncident: Incident = {
      ...incident,
      id: `INC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
    };

    this.activeIncidents.set(fullIncident.id, fullIncident);

    // Log incident
    logger.warn('Incident created', {
      incidentId: fullIncident.id,
      title: fullIncident.title,
      severity: fullIncident.severity,
      source: fullIncident.source,
    });

    // Start escalation
    await this.startEscalation(fullIncident);

    return fullIncident;
  }

  /**
   * Start escalation process for an incident
   */
  private async startEscalation(incident: Incident): Promise<void> {
    if (!this.escalationPolicy) return;

    for (const step of this.escalationPolicy.steps) {
      if (step.delayMinutes === 0) {
        // Immediate notification
        await this.notifyChannels(incident, step.channels);
      } else {
        // Scheduled notification
        const timer = setTimeout(async () => {
          // Check if incident is still active and not acknowledged
          const currentIncident = this.activeIncidents.get(incident.id);
          if (currentIncident && !currentIncident.acknowledgedAt) {
            await this.notifyChannels(incident, step.channels);
          }
        }, step.delayMinutes * 60 * 1000);

        this.escalationTimers.set(`${incident.id}-${step.delayMinutes}`, timer);
      }
    }
  }

  /**
   * Notify specified channels about an incident
   */
  private async notifyChannels(incident: Incident, channels: AlertChannel[]): Promise<void> {
    const notifications = channels.map(async (channelType) => {
      const channelConfig = this.channels.get(channelType);
      if (!channelConfig || !channelConfig.enabled) return;

      // Check minimum severity
      if (channelConfig.minSeverity) {
        if (severityLevels[incident.severity] < severityLevels[channelConfig.minSeverity]) {
          return;
        }
      }

      try {
        switch (channelType) {
          case 'slack':
            await this.sendSlackAlert(incident, channelConfig);
            break;
          case 'pagerduty':
            await this.sendPagerDutyAlert(incident, channelConfig);
            break;
          case 'webhook':
            await this.sendWebhookAlert(incident, channelConfig);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send alert to ${channelType}`, { error, incidentId: incident.id });
      }
    });

    await Promise.allSettled(notifications);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(incident: Incident, channelConfig: AlertChannelConfig): Promise<void> {
    if (!channelConfig.url) return;

    const severityEmoji: Record<IncidentSeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };

    const severityColor: Record<IncidentSeverity, string> = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745',
    };

    const payload = {
      channel: channelConfig.channel,
      attachments: [
        {
          color: severityColor[incident.severity],
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${severityEmoji[incident.severity]} ${incident.title}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: incident.description,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Severity:*\n${incident.severity.toUpperCase()}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Source:*\n${incident.source}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Incident ID:*\n${incident.id}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${incident.timestamp.toISOString()}`,
                },
              ],
            },
          ],
        },
      ],
    };

    if (incident.runbookUrl) {
      payload.attachments[0].blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📖 <${incident.runbookUrl}|View Runbook>`,
        },
      });
    }

    await fetch(channelConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    logger.debug('Slack alert sent', { incidentId: incident.id });
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(incident: Incident, channelConfig: AlertChannelConfig): Promise<void> {
    if (!channelConfig.token) return;

    const severityMap: Record<IncidentSeverity, string> = {
      critical: 'critical',
      high: 'error',
      medium: 'warning',
      low: 'info',
    };

    const payload = {
      routing_key: channelConfig.token,
      event_action: 'trigger',
      dedup_key: incident.id,
      payload: {
        summary: `[${incident.severity.toUpperCase()}] ${incident.title}`,
        severity: severityMap[incident.severity],
        source: incident.source,
        timestamp: incident.timestamp.toISOString(),
        custom_details: {
          description: incident.description,
          incident_id: incident.id,
          ...incident.metadata,
        },
      },
      links: incident.runbookUrl
        ? [{ href: incident.runbookUrl, text: 'Runbook' }]
        : undefined,
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    logger.debug('PagerDuty alert sent', { incidentId: incident.id });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(incident: Incident, channelConfig: AlertChannelConfig): Promise<void> {
    if (!channelConfig.url) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (channelConfig.token) {
      headers['Authorization'] = `Bearer ${channelConfig.token}`;
    }

    await fetch(channelConfig.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'incident.created',
        incident,
      }),
    });

    logger.debug('Webhook alert sent', { incidentId: incident.id });
  }

  /**
   * Acknowledge an incident
   */
  acknowledgeIncident(incidentId: string): boolean {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return false;

    incident.acknowledgedAt = new Date();

    // Clear escalation timers
    this.clearEscalationTimers(incidentId);

    logger.info('Incident acknowledged', { incidentId });
    return true;
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(incidentId: string): Promise<boolean> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return false;

    incident.resolvedAt = new Date();

    // Clear escalation timers
    this.clearEscalationTimers(incidentId);

    // Send resolution notification to PagerDuty
    const pagerdutyConfig = this.channels.get('pagerduty');
    if (pagerdutyConfig?.enabled && pagerdutyConfig.token) {
      try {
        await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: pagerdutyConfig.token,
            event_action: 'resolve',
            dedup_key: incidentId,
          }),
        });
      } catch (error) {
        logger.error('Failed to resolve PagerDuty incident', { error, incidentId });
      }
    }

    logger.info('Incident resolved', { incidentId });
    return true;
  }

  /**
   * Clear escalation timers for an incident
   */
  private clearEscalationTimers(incidentId: string): void {
    for (const [key, timer] of this.escalationTimers) {
      if (key.startsWith(incidentId)) {
        clearTimeout(timer);
        this.escalationTimers.delete(key);
      }
    }
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values()).filter(
      (incident) => !incident.resolvedAt
    );
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): Incident | undefined {
    return this.activeIncidents.get(incidentId);
  }

  /**
   * Set custom escalation policy
   */
  setEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicy = policy;
    logger.info('Escalation policy updated', { policyName: policy.name });
  }

  /**
   * Add or update alert channel
   */
  configureChannel(channelConfig: AlertChannelConfig): void {
    this.channels.set(channelConfig.type, channelConfig);
    logger.info('Alert channel configured', { type: channelConfig.type });
  }
}

// Export singleton instance
export const incidentResponseService = new IncidentResponseService();

/**
 * Quick helper to create an incident
 */
export async function createIncident(
  title: string,
  description: string,
  severity: IncidentSeverity,
  source: string,
  metadata?: Record<string, unknown>
): Promise<Incident> {
  return incidentResponseService.createIncident({
    title,
    description,
    severity,
    source,
    metadata,
  });
}

