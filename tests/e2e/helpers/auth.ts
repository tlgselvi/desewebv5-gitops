import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Gets the auth token from storageState.json
 */
export async function getAuthToken(): Promise<string | null> {
  const storageStatePath = path.resolve(process.cwd(), 'tests/setup/storageState.json');
  
  if (fs.existsSync(storageStatePath)) {
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    // Try to find in localStorage first
    const localToken = storageState?.origins?.[0]?.localStorage?.find(
      (item: { name: string }) => item.name === 'token'
    )?.value;

    if (localToken) return localToken;
  }
  return null;
}

/**
 * Sets up authentication for API requests by adding Authorization header
 * to all API routes using the token from storageState.json
 */
export async function setupAuthInterceptor(page: Page): Promise<void> {
  const token = await getAuthToken();
  
  if (token) {
    // Intercept all API requests and add Authorization header
    await page.route('**/api/**', async (route) => {
      const headers = {
        ...route.request().headers(),
        'Authorization': `Bearer ${token}`,
      };
      await route.continue({ headers });
    });
  }
}

