import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../../utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class AutoRemediator {
    logPath;
    constructor(logDir = 'logs') {
        // Use process.cwd() for Docker/Kubernetes compatibility
        // Fallback to relative path if process.cwd() fails
        const projectRoot = process.cwd() || path.resolve('.');
        this.logPath = path.join(projectRoot, logDir, 'aiops-remediation.log');
        // Ensure logs directory exists
        const logDirPath = path.dirname(this.logPath);
        if (!fs.existsSync(logDirPath)) {
            try {
                fs.mkdirSync(logDirPath, { recursive: true, mode: 0o755 });
            }
            catch (error) {
                // If mkdir fails, use /tmp as fallback (Kubernetes compatible)
                const tmpPath = path.join('/tmp', logDir, 'aiops-remediation.log');
                logger.warn('Failed to create logs directory, using /tmp', {
                    originalPath: logDirPath,
                    fallbackPath: tmpPath,
                    error
                });
                this.logPath = tmpPath;
                const tmpDir = path.dirname(this.logPath);
                if (!fs.existsSync(tmpDir)) {
                    fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 });
                }
            }
        }
    }
    recordEvent(event) {
        try {
            const line = JSON.stringify(event) + '\n';
            fs.appendFileSync(this.logPath, line);
            logger.info('Remediation event recorded', {
                metric: event.metric,
                action: event.action,
                severity: event.severity,
                status: event.status,
            });
        }
        catch (error) {
            logger.error('Error recording remediation event', { error, event });
        }
    }
    suggestAction(metric, severity) {
        if (severity === 'high') {
            return `Restart deployment for ${metric}`;
        }
        if (severity === 'medium') {
            return `Scale pods for ${metric}`;
        }
        return `Monitor metric ${metric}`;
    }
    replay() {
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
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            })
                .filter((event) => event !== null);
            // Return last 50 events
            return events.slice(-50);
        }
        catch (error) {
            logger.error('Error reading remediation log', { error });
            return [];
        }
    }
    getRemediationHistory(count = 10) {
        const events = this.replay();
        return events.slice(-count);
    }
}
//# sourceMappingURL=autoRemediator.js.map