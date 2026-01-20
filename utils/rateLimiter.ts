// Rate Limiting Utilities
// Prevents brute force attacks and excessive requests

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { config } from './config';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

/**
 * Check if an action should be rate limited
 * @param key - Unique identifier for the rate limit (e.g., email, IP)
 * @param maxAttempts - Maximum number of attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false otherwise
 */
export async function isRateLimited(
  key: string,
  maxAttempts: number = config.security.maxLoginAttempts,
  windowMs: number = config.security.loginAttemptWindow
): Promise<boolean> {
  try {
    const recordKey = `rateLimit_${key}`;
    const recordData = await AsyncStorage.getItem(recordKey);
    
    const now = Date.now();
    let record: AttemptRecord;

    if (recordData) {
      record = JSON.parse(recordData);
      
      // Check if window has expired
      if (now - record.firstAttempt > windowMs) {
        // Reset the record
        record = {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
        };
      } else {
        // Increment count
        record.count++;
        record.lastAttempt = now;
      }
    } else {
      // First attempt
      record = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
    }

    // Save updated record
    await AsyncStorage.setItem(recordKey, JSON.stringify(record));

    // Check if rate limited
    if (record.count > maxAttempts) {
      logger.warn('Rate limit exceeded', { 
        key, 
        count: record.count, 
        maxAttempts,
        timeRemaining: windowMs - (now - record.firstAttempt)
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Rate limit check failed', error instanceof Error ? error : new Error(String(error)), { key });
    // On error, don't rate limit (fail open)
    return false;
  }
}

/**
 * Reset rate limit for a key
 * @param key - Unique identifier for the rate limit
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const recordKey = `rateLimit_${key}`;
    await AsyncStorage.removeItem(recordKey);
    logger.info('Rate limit reset', { key });
  } catch (error) {
    logger.error('Failed to reset rate limit', error instanceof Error ? error : new Error(String(error)), { key });
  }
}

/**
 * Get remaining attempts for a key
 * @param key - Unique identifier for the rate limit
 * @param maxAttempts - Maximum number of attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns Number of remaining attempts
 */
export async function getRemainingAttempts(
  key: string,
  maxAttempts: number = config.security.maxLoginAttempts,
  windowMs: number = config.security.loginAttemptWindow
): Promise<number> {
  try {
    const recordKey = `rateLimit_${key}`;
    const recordData = await AsyncStorage.getItem(recordKey);
    
    if (!recordData) {
      return maxAttempts;
    }

    const record: AttemptRecord = JSON.parse(recordData);
    const now = Date.now();

    // Check if window has expired
    if (now - record.firstAttempt > windowMs) {
      return maxAttempts;
    }

    return Math.max(0, maxAttempts - record.count);
  } catch (error) {
    logger.error('Failed to get remaining attempts', error instanceof Error ? error : new Error(String(error)), { key });
    return maxAttempts;
  }
}

/**
 * Get time until rate limit resets in milliseconds
 * @param key - Unique identifier for the rate limit
 * @param windowMs - Time window in milliseconds
 * @returns Time until reset in milliseconds, or 0 if not rate limited
 */
export async function getTimeUntilReset(
  key: string,
  windowMs: number = config.security.loginAttemptWindow
): Promise<number> {
  try {
    const recordKey = `rateLimit_${key}`;
    const recordData = await AsyncStorage.getItem(recordKey);
    
    if (!recordData) {
      return 0;
    }

    const record: AttemptRecord = JSON.parse(recordData);
    const now = Date.now();
    const elapsed = now - record.firstAttempt;
    const remaining = windowMs - elapsed;

    return Math.max(0, remaining);
  } catch (error) {
    logger.error('Failed to get time until reset', error instanceof Error ? error : new Error(String(error)), { key });
    return 0;
  }
}
