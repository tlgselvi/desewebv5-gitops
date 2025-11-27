/**
 * Security Test Reporter
 * 
 * Generates reports in multiple formats:
 * - HTML report
 * - JSON report
 * - JUnit XML report
 */

import { SecurityTestResult, SecurityTestSeverity } from '../security-test-framework.js';
import fs from 'fs/promises';
import path from 'path';

export interface SecurityTestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    bySeverity: Record<SecurityTestSeverity, number>;
  };
  results: SecurityTestResult[];
  duration: number;
}

export class SecurityTestReporter {
  /**
   * Generate HTML report
   */
  static async generateHTMLReport(
    report: SecurityTestReport,
    outputPath: string
  ): Promise<void> {
    const html = this.generateHTML(report);
    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Generate JSON report
   */
  static async generateJSONReport(
    report: SecurityTestReport,
    outputPath: string
  ): Promise<void> {
    const json = JSON.stringify(report, null, 2);
    await fs.writeFile(outputPath, json, 'utf-8');
  }

  /**
   * Generate JUnit XML report
   */
  static async generateJUnitXMLReport(
    report: SecurityTestReport,
    outputPath: string
  ): Promise<void> {
    const xml = this.generateJUnitXML(report);
    await fs.writeFile(outputPath, xml, 'utf-8');
  }

  /**
   * Generate all report formats
   */
  static async generateAllReports(
    report: SecurityTestReport,
    outputDir: string
  ): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    await Promise.all([
      this.generateHTMLReport(report, path.join(outputDir, `security-report-${timestamp}.html`)),
      this.generateJSONReport(report, path.join(outputDir, `security-report-${timestamp}.json`)),
      this.generateJUnitXMLReport(report, path.join(outputDir, `security-report-${timestamp}.xml`)),
    ]);
  }

  private static generateHTML(report: SecurityTestReport): string {
    const passedPercentage = report.summary.total > 0
      ? Math.round((report.summary.passed / report.summary.total) * 100)
      : 0;

    const severityColors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#6c757d',
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .summary-card {
            padding: 20px;
            border-radius: 8px;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
        }
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #333;
        }
        .summary-card.passed { border-left-color: #28a745; }
        .summary-card.failed { border-left-color: #dc3545; }
        .summary-card.total { border-left-color: #007bff; }
        .severity-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .severity-critical { background-color: ${severityColors.critical}; }
        .severity-high { background-color: ${severityColors.high}; }
        .severity-medium { background-color: ${severityColors.medium}; }
        .severity-low { background-color: ${severityColors.low}; }
        .test-result {
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
            border-left: 4px solid #ddd;
        }
        .test-result.passed {
            background-color: #d4edda;
            border-left-color: #28a745;
        }
        .test-result.failed {
            background-color: #f8d7da;
            border-left-color: #dc3545;
        }
        .test-result h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .test-result .message {
            color: #666;
            margin: 5px 0;
        }
        .test-result .remediation {
            margin-top: 10px;
            padding: 10px;
            background-color: #fff3cd;
            border-radius: 4px;
            border-left: 3px solid #ffc107;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #007bff;
            color: white;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Security Test Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Duration:</strong> ${report.duration}ms</p>

        <div class="summary">
            <div class="summary-card total">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.total}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${report.summary.passed}</div>
                <div>${passedPercentage}%</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="value">${report.summary.failed}</div>
                <div>${100 - passedPercentage}%</div>
            </div>
        </div>

        <h2>Severity Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Severity</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><span class="severity-badge severity-critical">Critical</span></td>
                    <td>${report.summary.bySeverity.critical}</td>
                </tr>
                <tr>
                    <td><span class="severity-badge severity-high">High</span></td>
                    <td>${report.summary.bySeverity.high}</td>
                </tr>
                <tr>
                    <td><span class="severity-badge severity-medium">Medium</span></td>
                    <td>${report.summary.bySeverity.medium}</td>
                </tr>
                <tr>
                    <td><span class="severity-badge severity-low">Low</span></td>
                    <td>${report.summary.bySeverity.low}</td>
                </tr>
            </tbody>
        </table>

        <h2>Test Results</h2>
        ${report.results.map((result, index) => `
            <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                <h4>Test #${index + 1}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}</h4>
                <div class="message">
                    <strong>Severity:</strong> <span class="severity-badge severity-${result.severity}">${result.severity.toUpperCase()}</span>
                </div>
                <div class="message"><strong>Message:</strong> ${result.message}</div>
                ${result.details ? `<div class="message"><strong>Details:</strong> <pre>${JSON.stringify(result.details, null, 2)}</pre></div>` : ''}
                ${result.remediation ? `<div class="remediation"><strong>Remediation:</strong> ${result.remediation}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  private static generateJUnitXML(report: SecurityTestReport): string {
    const testsuites = `
<testsuites>
    <testsuite name="Security Tests" tests="${report.summary.total}" failures="${report.summary.failed}" time="${report.duration / 1000}">
        ${report.results.map((result, index) => `
            <testcase name="Test ${index + 1}" classname="SecurityTest" time="0">
                ${!result.passed ? `
                    <failure message="${this.escapeXML(result.message)}" type="${result.severity}">
                        ${this.escapeXML(JSON.stringify(result.details || {}, null, 2))}
                    </failure>
                ` : ''}
            </testcase>
        `).join('')}
    </testsuite>
</testsuites>`;

    return `<?xml version="1.0" encoding="UTF-8"?>${testsuites}`;
  }

  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

