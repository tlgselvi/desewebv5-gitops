import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '@/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RemediationEvent {
  timestamp: number;
  metric: string;
  action: string;
  severity: 'low' | 'medium' | 'high';
  status: 'executed' | 'pending' | 'failed';
}

export class AutoRemediator {
  private logPath: string;

  constructor(logDir: string = 'logs') {
    const projectRoot = path.resolve(__dirname, '../../../../');
    this.logPath = path.join(projectRoot, logDir, 'aiops-remediation.log');
    
    // Ensure logs directory exists
    const logDirPath = path.dirname(this.logPath);
    if (!fs.existsSync(logDirPath)) {
      fs.mkdirSync(logDirPath, { recursive: true });
    }
  }

  recordEvent(event: RemediationEvent): void {
    try {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.logPath, line);
      
      logger.info('Remediation event recorded', {
        metric: event.metric,
        action: event.action,
        severity: event.severity,
        status: event.status,
      });
    } catch (error) {
      logger.error('Error recording remediation event', { error, event });
    }
  }

  suggestAction(metric: string, severity: string): string {
    if (severity === 'high') {
      return `Restart deployment for ${metric}`;
    }
    if (severity === 'medium') {
      return `Scale pods for ${metric}`;
    }
    return `Monitor metric ${metric}`;
  }

  replay(): RemediationEvent[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const data = fs.readFileSync(this.logPath, 'utf8').trim();
      if (!data) {
        return [];
      }

      const lines = data.split('\n');
      const events = lines
        .map((line) => {
          try {
            return JSON.parse(line) as RemediationEvent;
          } catch {
            return null;
          }
        })
        .filter((event): event is RemediationEvent => event !== null);

      // Return last 50 events
      return events.slice(-50);
    } catch (error) {
      logger.error('Error reading remediation log', { error });
      return [];
    }
  }

  getRemediationHistory(count: number = 10): RemediationEvent[] {
    const events = this.replay();
    return events.slice(-count);
  }
}

