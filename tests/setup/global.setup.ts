import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import jwt from 'jsonwebtoken';

async function globalSetup(config: FullConfig) {
  // Load environment variables from .env file
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const storageState = path.resolve(process.cwd(), 'tests/setup/storageState.json');

  // Ensure the setup directory exists
  const setupDir = path.dirname(storageState);
  if (!fs.existsSync(setupDir)) {
    fs.mkdirSync(setupDir, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test user credentials from environment or defaults
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'password';

    console.log(`[Global Setup] Attempting to authenticate as ${testEmail}...`);

    // Try multiple possible auth endpoints
    const authEndpoints = [
      `${baseURL}/api/v1/auth/login`,
      `${baseURL}/auth/login`,
      `${baseURL}/api/auth/login`,
    ];

    let loginResponse = null;
    let lastError = null;

    for (const endpoint of authEndpoints) {
      try {
        console.log(`[Global Setup] Trying endpoint: ${endpoint}`);
        loginResponse = await page.request.post(endpoint, {
          data: {
            username: testEmail,
            password: testPassword,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (loginResponse.ok()) {
          const responseData = await loginResponse.json();
          console.log(`[Global Setup] Authentication successful via ${endpoint}:`, responseData);
          
          // Extract token if present
          if (responseData.access_token || responseData.token) {
            const token = responseData.access_token || responseData.token;
            
            // Navigate to baseURL to set localStorage
            await page.goto(baseURL);
            
            // Set token in localStorage (frontend uses localStorage for token storage)
            await page.evaluate((t) => {
              localStorage.setItem('token', t);
            }, token);
            
            // Also set as cookie for API requests
            await context.addCookies([{
              name: 'token',
              value: token,
              domain: 'localhost',
              path: '/',
            }]);
            
            console.log(`[Global Setup] Token stored in localStorage and cookies`);
          }
          
          // Save storage state (includes cookies and localStorage)
          await context.storageState({ path: storageState });
          console.log(`[Global Setup] Storage state saved to ${storageState}`);
          break;
        } else {
          const errorText = await loginResponse.text();
          console.warn(`[Global Setup] Login failed at ${endpoint}: ${loginResponse.status()} - ${errorText}`);
          lastError = new Error(`Authentication failed: ${loginResponse.status()} - ${errorText}`);
        }
      } catch (error) {
        console.warn(`[Global Setup] Error trying ${endpoint}:`, error);
        lastError = error;
      }
    }

    // If all endpoints failed, create storage state with mock token
    if (!loginResponse || !loginResponse.ok()) {
      console.warn('[Global Setup] All auth endpoints failed. Creating mock token for testing.');
      
      // Create a mock JWT token for testing
      const jwtSecret = process.env.JWT_SECRET || 'ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars';
      const defaultOrgId = '11111111-1111-1111-1111-111111111111';
      const mockToken = jwt.sign(
        {
          id: '22222222-2222-2222-2222-222222222222',
          email: testEmail,
          role: 'admin',
          organizationId: defaultOrgId,
          permissions: ['admin', 'mcp.dashboard.read'],
        },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      console.log('[Global Setup] Created mock JWT token for testing');
      
      // Navigate to baseURL to set localStorage
      await page.goto(baseURL);
      
      // Set mock token in localStorage
      await page.evaluate((t) => {
        localStorage.setItem('token', t);
      }, mockToken);
      
      // Save storage state (includes localStorage)
      await context.storageState({ path: storageState });
      console.log(`[Global Setup] Storage state saved with mock token to ${storageState}`);
      
      if (lastError) {
        console.warn('[Global Setup] Auth endpoint errors (using mock token):', lastError);
      }
    }
  } catch (error) {
    console.error('[Global Setup] Error during authentication:', error);
    
    // Create empty storage state as fallback
    await context.storageState({ path: storageState });
    console.warn('[Global Setup] Created empty storage state - tests may require manual authentication');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
