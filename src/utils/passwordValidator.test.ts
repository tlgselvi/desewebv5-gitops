import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  checkPasswordStrength,
  isPasswordCompromised,
} from './passwordValidator.js';

describe('Password Validator', () => {
  describe('validatePassword', () => {
    it('should accept valid strong password', () => {
      const result = validatePassword('MyStr0ng!Pass');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('mystrongpass1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.toLowerCase().includes('uppercase'))).toBe(true);
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('MYSTRONGPASS1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.toLowerCase().includes('lowercase'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = validatePassword('MyStrongPass!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.toLowerCase().includes('number') || err.toLowerCase().includes('digit'))).toBe(true);
    });

    it('should reject password without special character', () => {
      const result = validatePassword('MyStrongPass1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.toLowerCase().includes('special'))).toBe(true);
    });

    it('should reject common passwords', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.toLowerCase().includes('common') || err.toLowerCase().includes('stronger'))).toBe(true);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should return high score for strong password', () => {
      const result = checkPasswordStrength('MyV3ryStr0ng!Password123');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.isStrong).toBe(true);
    });

    it('should return low score for weak password', () => {
      const result = checkPasswordStrength('weak');
      expect(result.score).toBeLessThan(50);
      expect(result.isStrong).toBe(false);
    });

    it('should provide feedback for weak passwords', () => {
      const result = checkPasswordStrength('weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should give bonus for password with all character types', () => {
      const result = checkPasswordStrength('MyStr0ng!Pass');
      expect(result.score).toBeGreaterThan(60);
    });

    it('should give higher score for longer passwords', () => {
      const short = checkPasswordStrength('MyStr0ng!');
      const long = checkPasswordStrength('MyV3ryStr0ng!Password123');
      expect(long.score).toBeGreaterThan(short.score);
    });
  });

  describe('isPasswordCompromised', () => {
    it('should identify common compromised passwords', async () => {
      const compromised = await isPasswordCompromised('password');
      expect(compromised).toBe(true);
    });

    it('should return false for unique passwords', async () => {
      const compromised = await isPasswordCompromised('MyUn1que!Pass2024');
      expect(compromised).toBe(false);
    });

    it('should be case insensitive', async () => {
      const compromised = await isPasswordCompromised('PASSWORD');
      expect(compromised).toBe(true);
    });
  });
});

