/**
 * Advanced Validation and Sanitization Utilities
 * 
 * Provides:
 * - Input sanitization
 * - XSS prevention
 * - SQL injection prevention helpers
 * - Email/URL/phone validation
 * - Data type validation
 * - Custom validators
 * 
 * Based on proven patterns from:
 * - OWASP security guidelines
 * - Express-validator
 * - Joi validation library patterns
 */

import { logger } from './logger.js';

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick=, etc.)
    .trim();
}

/**
 * Sanitize HTML content (basic)
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const sanitized = email.trim().toLowerCase();
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Additional checks
  if (sanitized.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  const [localPart, domain] = sanitized.split('@');
  if (localPart.length > 64) {
    return { valid: false, error: 'Email local part is too long' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate and sanitize URL
 */
export function validateURL(url: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const sanitized = url.trim();
  
  try {
    const urlObj = new URL(sanitized);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    return { valid: true, sanitized: urlObj.toString() };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate phone number (international format)
 */
export function validatePhone(phone: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters except +
  const sanitized = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + (international format)
  if (!sanitized.startsWith('+')) {
    return { valid: false, error: 'Phone number must be in international format (+country code)' };
  }

  // Check length (minimum 8 digits, maximum 15 digits after +)
  const digits = sanitized.substring(1);
  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, error: 'Phone number must be between 8 and 15 digits' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate and sanitize integer
 */
export function validateInteger(
  value: unknown,
  options: { min?: number; max?: number } = {}
): { valid: boolean; value?: number; error?: string } {
  const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);

  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'Value must be an integer' };
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `Value must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `Value must be at most ${options.max}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate and sanitize float
 */
export function validateFloat(
  value: unknown,
  options: { min?: number; max?: number; precision?: number } = {}
): { valid: boolean; value?: number; error?: string } {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, error: 'Value must be a valid number' };
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `Value must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `Value must be at most ${options.max}` };
  }

  let finalValue = num;
  if (options.precision !== undefined) {
    finalValue = Number(num.toFixed(options.precision));
  }

  return { valid: true, value: finalValue };
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  options: { min?: number; max?: number; trim?: boolean } = {}
): { valid: boolean; sanitized?: string; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Value must be a string' };
  }

  const sanitized = options.trim !== false ? value.trim() : value;

  if (options.min !== undefined && sanitized.length < options.min) {
    return { valid: false, error: `String must be at least ${options.min} characters` };
  }

  if (options.max !== undefined && sanitized.length > options.max) {
    return { valid: false, error: `String must be at most ${options.max} characters` };
  }

  return { valid: true, sanitized };
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'UUID is required' };
  }

  const sanitized = uuid.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  if (!uuidRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate date
 */
export function validateDate(
  value: string | Date,
  options: { min?: Date; max?: Date } = {}
): { valid: boolean; value?: Date; error?: string } {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else {
    return { valid: false, error: 'Value must be a date or date string' };
  }

  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }

  if (options.min && date < options.min) {
    return { valid: false, error: `Date must be after ${options.min.toISOString()}` };
  }

  if (options.max && date > options.max) {
    return { valid: false, error: `Date must be before ${options.max.toISOString()}` };
  }

  return { valid: true, value: date };
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate object against schema
 */
export function validateObject<T>(
  obj: unknown,
  schema: Record<string, (value: unknown) => { valid: boolean; value?: any; error?: string }>
): { valid: boolean; value?: T; errors?: Record<string, string> } {
  if (typeof obj !== 'object' || obj === null) {
    return { valid: false, errors: { _root: 'Value must be an object' } };
  }

  const errors: Record<string, string> = {};
  const validated: any = {};

  for (const [key, validator] of Object.entries(schema)) {
    const value = (obj as any)[key];
    const result = validator(value);

    if (!result.valid) {
      errors[key] = result.error || 'Validation failed';
    } else if (result.value !== undefined) {
      validated[key] = result.value;
    } else {
      validated[key] = value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value: validated as T };
}

/**
 * Prevent SQL injection by escaping special characters
 * Note: This is a basic helper. Always use parameterized queries!
 */
export function escapeSQLString(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }

  return str
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\0/g, '\\0') // Escape null bytes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\x1a/g, '\\Z'); // Escape Ctrl+Z
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSQLInjection(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/, // SQL comments
    /(;|\||&)/, // Command separators
    /(UNION|JOIN)/i,
    /(OR|AND)\s+\d+\s*=\s*\d+/i, // OR 1=1, AND 1=1
  ];

  return sqlPatterns.some((pattern) => pattern.test(str));
}

/**
 * Check if string contains XSS patterns
 */
export function containsXSS(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(str));
}

