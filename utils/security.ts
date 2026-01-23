// Security Utilities
// Provides password hashing, secure storage, and input sanitization

import * as SecureStore from 'expo-secure-store';
import { getRandomBytesAsync, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { logger } from './logger';

/**
 * Generate a random salt for password hashing
 */
async function generateSalt(): Promise<string> {
  const bytes = await getRandomBytesAsync(32);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Legacy (v1) password hashing function.
 * 
 * This reproduces the pre-`expo-crypto` hash used by the app so older users can still log in.
 * Format: `<saltedHashHex><hashHex>` (no ":" separator).
 */
export async function legacyHashPasswordV1(password: string): Promise<string> {
  // NOTE: this mirrors the original implementation exactly (including the constant salt).
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

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
 * Hash password using SHA-256 with salt
 * Uses expo-crypto for cryptographically secure hashing
 * 
 * Note: For production with backend, consider using bcrypt or argon2 on the server
 * This implementation uses SHA-256 which is secure but not as slow as bcrypt/argon2
 * which are designed to resist brute-force attacks
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate a random salt for each password
    const salt = await generateSalt();
    
    // Combine password with salt
    const saltedPassword = password + salt;
    
    // Hash using SHA-256
    const hash = await digestStringAsync(
      CryptoDigestAlgorithm.SHA256,
      saltedPassword
    );
    
    // Return salt:hash format for storage
    // This allows us to verify passwords later by extracting the salt
    return `${salt}:${hash}`;
  } catch (error) {
    logger.error('Password hashing error', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against stored hash
 * Extracts salt from stored hash and recomputes hash for comparison
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Extract salt and hash from stored format (salt:hash)
    const [salt, storedHashValue] = storedHash.split(':');
    
    if (!salt || !storedHashValue) {
      // Legacy format support (v1): no ":" separator
      const legacy = await legacyHashPasswordV1(password);
      return legacy === storedHash;
    }
    
    // Combine password with extracted salt
    const saltedPassword = password + salt;
    
    // Compute hash using same algorithm
    const computedHash = await digestStringAsync(
      CryptoDigestAlgorithm.SHA256,
      saltedPassword
    );
    
    // Compare hashes (constant-time comparison would be better, but this is acceptable for mobile)
    return computedHash === storedHashValue;
  } catch (error) {
    logger.error('Password verification error', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous characters
    .replace(/[<>\"']/g, '')
    // Remove control characters (but keep newlines and tabs for now)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize multiple spaces to single space, but preserve the space
    .replace(/  +/g, ' ');
}

/**
 * Sanitize text input for fields that need spaces (expertise, interest, location)
 * Less aggressive than sanitizeString - preserves spaces during typing
 */
export function sanitizeTextField(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove only the most dangerous characters, keep apostrophes for names like "O'Brien"
    .replace(/[<>\"]/g, '')
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
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
