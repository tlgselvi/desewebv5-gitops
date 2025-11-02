import puppeteer, { Browser, Page, CDPSession } from 'puppeteer';
import { logger } from '@/utils/logger.js';
import { z } from 'zod';

// Validation schemas
const CDPConnectionSchema = z.object({
  url: z.string().url('Invalid CDP connection URL'),
  browserType: z.enum(['chrome', 'chromium', 'edge']).default('chrome'),
});

const BrowserActionSchema = z.object({
  action: z.enum(['navigate', 'screenshot', 'evaluate', 'click', 'type', 'wait']),
  params: z.record(z.any()).optional(),
});

export interface BrowserConnection {
  id: string;
  browserType: string;
  cdpUrl: string;
  wsEndpoint?: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: Date;
}

export class BrowserAutomationService {
  private browsers: Map<string, Browser> = new Map();
  private pages: Map<string, Page> = new Map();
  private cdpSessions: Map<string, CDPSession> = new Map();
  private connections: Map<string, BrowserConnection> = new Map();

  /**
   * Connect to a browser via CDP (Chrome DevTools Protocol)
   */
  async connectCDP(connectionUrl: string, browserType: 'chrome' | 'chromium' | 'edge' = 'chrome'): Promise<BrowserConnection> {
    try {
      const validated = CDPConnectionSchema.parse({ url: connectionUrl, browserType });

      // Try to connect to existing browser
      const browser = await puppeteer.connect({
        browserURL: validated.url.replace(/^ws:\/\//, 'http://').replace(/\/devtools\/.*$/, ''),
        defaultViewport: null,
      });

      const wsEndpoint = browser.wsEndpoint();
      const connectionId = `cdp-${Date.now()}`;

      const connection: BrowserConnection = {
        id: connectionId,
        browserType: validated.browserType,
        cdpUrl: validated.url,
        wsEndpoint,
        status: 'connected',
        connectedAt: new Date(),
      };

      this.browsers.set(connectionId, browser);
      this.connections.set(connectionId, connection);

      logger.info('CDP connection established', {
        connectionId,
        browserType: validated.browserType,
        cdpUrl: validated.url,
      });

      return connection;
    } catch (error: any) {
      logger.error('Failed to connect to CDP', { error: error.message, connectionUrl });
      throw new Error(`CDP connection failed: ${error.message}`);
    }
  }

  /**
   * Launch a new browser instance
   */
  async launchBrowser(options: {
    headless?: boolean;
    args?: string[];
  } = {}): Promise<BrowserConnection> {
    try {
      const browser = await puppeteer.launch({
        headless: options.headless !== false,
        args: options.args || [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const wsEndpoint = browser.wsEndpoint();
      const connectionId = `browser-${Date.now()}`;

      const connection: BrowserConnection = {
        id: connectionId,
        browserType: 'chrome',
        cdpUrl: wsEndpoint,
        wsEndpoint,
        status: 'connected',
        connectedAt: new Date(),
      };

      this.browsers.set(connectionId, browser);
      this.connections.set(connectionId, connection);

      logger.info('Browser launched', { connectionId, wsEndpoint });

      return connection;
    } catch (error: any) {
      logger.error('Failed to launch browser', { error: error.message });
      throw new Error(`Browser launch failed: ${error.message}`);
    }
  }

  /**
   * Create a new page in the browser
   */
  async createPage(connectionId: string): Promise<string> {
    const browser = this.browsers.get(connectionId);
    if (!browser) {
      throw new Error(`Browser connection not found: ${connectionId}`);
    }

    try {
      const page = await browser.newPage();
      const pageId = `page-${Date.now()}`;
      this.pages.set(pageId, page);

      logger.info('Page created', { connectionId, pageId });
      return pageId;
    } catch (error: any) {
      logger.error('Failed to create page', { connectionId, error: error.message });
      throw new Error(`Page creation failed: ${error.message}`);
    }
  }

  /**
   * Create a CDP session for a page
   */
  async createCDPSession(pageId: string): Promise<string> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    try {
      const client = await page.target().createCDPSession();
      const sessionId = `cdp-session-${Date.now()}`;
      this.cdpSessions.set(sessionId, client);

      // Enable necessary domains
      await client.send('Runtime.enable');
      await client.send('Network.enable');
      await client.send('Page.enable');

      logger.info('CDP session created', { pageId, sessionId });
      return sessionId;
    } catch (error: any) {
      logger.error('Failed to create CDP session', { pageId, error: error.message });
      throw new Error(`CDP session creation failed: ${error.message}`);
    }
  }

  /**
   * Execute browser action
   */
  async executeAction(
    pageId: string,
    action: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const validated = BrowserActionSchema.parse({ action, params });

    try {
      switch (validated.action) {
        case 'navigate': {
          const url = params.url as string;
          await page.goto(url, { waitUntil: 'networkidle2' });
          return { success: true, url };
        }

        case 'screenshot': {
          const fullPage = params.fullPage === true;
          const screenshot = await page.screenshot({
            fullPage,
            type: 'png',
          });
          return {
            success: true,
            screenshot: screenshot.toString('base64'),
          };
        }

        case 'evaluate': {
          const script = params.script as string;
          const result = await page.evaluate(script);
          return { success: true, result };
        }

        case 'click': {
          const selector = params.selector as string;
          await page.click(selector);
          return { success: true, selector };
        }

        case 'type': {
          const selector = params.selector as string;
          const text = params.text as string;
          await page.type(selector, text);
          return { success: true, selector, text };
        }

        case 'wait': {
          const timeout = params.timeout || 5000;
          const selector = params.selector;
          if (selector) {
            await page.waitForSelector(selector, { timeout });
          } else {
            await page.waitForTimeout(timeout);
          }
          return { success: true, timeout };
        }

        default:
          throw new Error(`Unknown action: ${validated.action}`);
      }
    } catch (error: any) {
      logger.error('Browser action failed', { pageId, action, error: error.message });
      throw new Error(`Action failed: ${error.message}`);
    }
  }

  /**
   * Send CDP command
   */
  async sendCDPCommand(sessionId: string, method: string, params: Record<string, any> = {}): Promise<any> {
    const session = this.cdpSessions.get(sessionId);
    if (!session) {
      throw new Error(`CDP session not found: ${sessionId}`);
    }

    try {
      const result = await session.send(method as any, params);
      logger.info('CDP command executed', { sessionId, method });
      return result;
    } catch (error: any) {
      logger.error('CDP command failed', { sessionId, method, error: error.message });
      throw new Error(`CDP command failed: ${error.message}`);
    }
  }

  /**
   * Get connection status
   */
  getConnection(connectionId: string): BrowserConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * List all connections
   */
  listConnections(): BrowserConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Disconnect browser
   */
  async disconnect(connectionId: string): Promise<void> {
    const browser = this.browsers.get(connectionId);
    if (browser) {
      await browser.disconnect();
      this.browsers.delete(connectionId);
    }

    // Close all pages for this connection
    for (const [pageId, page] of this.pages.entries()) {
      try {
        await page.close();
      } catch {
        // Ignore errors
      }
      this.pages.delete(pageId);
    }

    // Close all CDP sessions
    for (const [sessionId] of this.cdpSessions.entries()) {
      this.cdpSessions.delete(sessionId);
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
    }

    logger.info('Browser disconnected', { connectionId });
  }

  /**
   * Check if Chrome is available
   */
  async checkChromeAvailability(): Promise<boolean> {
    try {
      // Try to detect Chrome
      const executablePath = await puppeteer.executablePath();
      return executablePath !== null;
    } catch {
      return false;
    }
  }
}

export const browserAutomation = new BrowserAutomationService();

