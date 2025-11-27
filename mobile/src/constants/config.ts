/**
 * App Configuration Constants
 */

export const CONFIG = {
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
  APP_VERSION: '1.0.0',
  APP_NAME: 'DESE EA Plan',
} as const;

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

