import { z } from 'zod';
import { logger } from './logger.js';

/**
 * Password strength validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => {
      // Check for common passwords
      const commonPasswords = [
        'password',
        'password123',
        '12345678',
        'qwerty123',
        'admin123',
        'letmein',
        'welcome123',
      ];
      return !commonPasswords.includes(password.toLowerCase());
    },
    {
      message: 'Password is too common, please choose a stronger password',
    }
  );

/**
 * Password strength checker
 * Returns a score from 0-100
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 20;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 10;
  }

  if (password.length >= 16) {
    score += 10;
  }

  // Character variety
  if (/[a-z]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add special characters');
  }

  // Complexity checks
  if (password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    score += 20; // Bonus for having all types
  }

  const isStrong = score >= 70;

  if (feedback.length === 0 && score < 100) {
    feedback.push('Consider making your password longer for better security');
  }

  return {
    score,
    feedback: feedback.length > 0 ? feedback : ['Password is strong'],
    isStrong,
  };
}

/**
 * Validate password using schema
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  try {
    passwordSchema.parse(password);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((err) => err.message),
      };
    }
    logger.error('Password validation error', { error });
    return {
      valid: false,
      errors: ['Invalid password format'],
    };
  }
}

/**
 * Check if password has been compromised (basic check against common passwords)
 * In production, integrate with Have I Been Pwned API
 */
export async function isPasswordCompromised(password: string): Promise<boolean> {
  // Common passwords list (should be expanded or use external service)
  const compromisedPasswords = [
    'password',
    '12345678',
    '123456789',
    '1234567890',
    'qwerty123',
    'admin123',
    'letmein',
    'welcome123',
    'password1',
    'Password1',
  ];

  // In production, use: https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
  // Or integrate with: npm package 'hibp'
  
  return compromisedPasswords.includes(password.toLowerCase());
}

