// Security Utilities
// Provides password hashing, secure storage, and input sanitization

import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

/**
 * Simple password hashing function
 * Note: For production, use a proper library like bcrypt or argon2
 * This is a basic implementation for demonstration
 */
export async function hashPassword(password: string): Promise<string> {
  // Simple hash implementation
  // In production, use: expo-crypto with SHA-256 or a proper hashing library
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Add salt and additional complexity
  const salt = 'mentormatch_salt_2024';
  const saltedPassword = password + salt;
  let saltedHash = 0;
  for (let i = 0; i < saltedPassword.length; i++) {
    const char = saltedPassword.charCodeAt(i);
    saltedHash = ((saltedHash << 5) - saltedHash) + char;
    saltedHash = saltedHash & saltedHash;
  }
  return Math.abs(saltedHash).toString(16) + Math.abs(hash).toString(16);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous characters
    .replace(/[<>\"']/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return sanitizeString(email).toLowerCase();
}

/**
 * Sanitize phone number input
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +, -, spaces, parentheses
  return phone.replace(/[^\d\s\-\+\(\)]/g, '').trim();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string): string {
  // Remove all non-digit characters
  return input.replace(/\D/g, '');
}

/**
 * Secure storage wrapper using expo-secure-store
 */
export class SecureStorage {
  /**
   * Store sensitive data securely
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error('Secure storage set error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error('Secure storage get error', error instanceof Error ? error : new Error(String(error)), { key });
      return null;
    }
  }

  /**
   * Delete sensitive data
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('Secure storage delete error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }
}
