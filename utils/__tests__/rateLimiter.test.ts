/**
 * Rate Limiter Tests
 * 
 * Tests for utils/rateLimiter.ts - rate limiting utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isRateLimited,
  resetRateLimit,
  getRemainingAttempts,
  getTimeUntilReset,
} from '../rateLimiter';
import * as config from '../config';

// Mock dependencies
jest.mock('../config');

const mockConfig = config.config as any;

describe('Rate Limiter', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockConfig.security = {
      maxLoginAttempts: 5,
      loginAttemptWindow: 15 * 60 * 1000, // 15 minutes
    };
  });

  describe('isRateLimited', () => {
    it('should return false for first attempt', async () => {
      const isLimited = await isRateLimited('test@example.com');

      expect(isLimited).toBe(false);
    });

    it('should return false when under max attempts', async () => {
      const key = 'test@example.com';
      
      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        await isRateLimited(key);
      }

      const isLimited = await isRateLimited(key);
      expect(isLimited).toBe(false);
    });

    it('should return true when max attempts exceeded', async () => {
      const key = 'test@example.com';
      
      // Make 6 attempts (exceeding max of 5)
      for (let i = 0; i < 6; i++) {
        await isRateLimited(key);
      }

      const isLimited = await isRateLimited(key);
      expect(isLimited).toBe(true);
    });

    it('should reset count when window expires', async () => {
      const key = 'test@example.com';
      
      // Make 4 attempts
      for (let i = 0; i < 4; i++) {
        await isRateLimited(key);
      }

      // Mock time to be after window
      const originalDateNow = Date.now;
      const futureTime = originalDateNow() + 16 * 60 * 1000; // 16 minutes later
      Date.now = jest.fn(() => futureTime);

      // Next attempt should reset and not be limited
      const isLimited = await isRateLimited(key);
      expect(isLimited).toBe(false);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should use custom maxAttempts', async () => {
      const key = 'test@example.com';
      
      // Make 3 attempts with maxAttempts of 2
      for (let i = 0; i < 3; i++) {
        await isRateLimited(key, 2);
      }

      const isLimited = await isRateLimited(key, 2);
      expect(isLimited).toBe(true);
    });

    it('should use custom windowMs', async () => {
      const key = 'test@example.com';
      const shortWindow = 1000; // 1 second
      
      // Make 2 attempts
      await isRateLimited(key, 5, shortWindow);
      await isRateLimited(key, 5, shortWindow);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next attempt should reset
      const isLimited = await isRateLimited(key, 5, shortWindow);
      expect(isLimited).toBe(false);
    });

    it('should handle AsyncStorage error gracefully', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      const isLimited = await isRateLimited('test@example.com');

      // Should fail open (return false on error)
      expect(isLimited).toBe(false);
    });

    it('should handle non-Error values thrown by AsyncStorage in isRateLimited', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce('non-error');

      const isLimited = await isRateLimited('test@example.com');

      // Should still fail open (return false on error)
      expect(isLimited).toBe(false);
    });

    it('should handle invalid JSON in storage', async () => {
      await AsyncStorage.setItem('rateLimit_test@example.com', 'invalid-json');

      const isLimited = await isRateLimited('test@example.com');

      // Should handle gracefully
      expect(isLimited).toBe(false);
    });

    it('should track attempts for different keys independently', async () => {
      const key1 = 'user1@example.com';
      const key2 = 'user2@example.com';
      
      // Make 6 attempts for key1
      for (let i = 0; i < 6; i++) {
        await isRateLimited(key1);
      }

      // key1 should be limited
      expect(await isRateLimited(key1)).toBe(true);
      
      // key2 should not be limited
      expect(await isRateLimited(key2)).toBe(false);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for a key', async () => {
      const key = 'test@example.com';
      
      // Make 6 attempts to get rate limited
      for (let i = 0; i < 6; i++) {
        await isRateLimited(key);
      }

      expect(await isRateLimited(key)).toBe(true);

      // Reset
      await resetRateLimit(key);

      // Should not be limited after reset
      expect(await isRateLimited(key)).toBe(false);
    });

    it('should handle AsyncStorage error gracefully', async () => {
      jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('Storage error'));

      await expect(resetRateLimit('test@example.com')).resolves.not.toThrow();
    });

    it('should handle non-Error values thrown by AsyncStorage in resetRateLimit', async () => {
      jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce('non-error');

      await expect(resetRateLimit('test@example.com')).resolves.not.toThrow();
    });

    it('should reset non-existent key without error', async () => {
      await expect(resetRateLimit('nonexistent@example.com')).resolves.not.toThrow();
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return maxAttempts for first attempt', async () => {
      const remaining = await getRemainingAttempts('test@example.com');

      expect(remaining).toBe(5); // maxLoginAttempts
    });

    it('should return correct remaining attempts', async () => {
      const key = 'test@example.com';
      
      // Make 2 attempts
      await isRateLimited(key);
      await isRateLimited(key);

      const remaining = await getRemainingAttempts(key);
      expect(remaining).toBe(3); // 5 - 2 = 3
    });

    it('should return 0 when max attempts reached', async () => {
      const key = 'test@example.com';
      
      // Make 5 attempts
      for (let i = 0; i < 5; i++) {
        await isRateLimited(key);
      }

      const remaining = await getRemainingAttempts(key);
      expect(remaining).toBe(0);
    });

    it('should return maxAttempts when window expires', async () => {
      const key = 'test@example.com';
      
      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        await isRateLimited(key);
      }

      // Mock time to be after window
      const originalDateNow = Date.now;
      const futureTime = originalDateNow() + 16 * 60 * 1000;
      Date.now = jest.fn(() => futureTime);

      const remaining = await getRemainingAttempts(key);
      expect(remaining).toBe(5); // Reset to max

      Date.now = originalDateNow;
    });

    it('should use custom maxAttempts', async () => {
      const key = 'test@example.com';
      
      await isRateLimited(key, 10);
      await isRateLimited(key, 10);

      const remaining = await getRemainingAttempts(key, 10);
      expect(remaining).toBe(8); // 10 - 2 = 8
    });

    it('should handle AsyncStorage error gracefully', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      const remaining = await getRemainingAttempts('test@example.com');

      // Should return maxAttempts on error
      expect(remaining).toBe(5);
    });

    it('should handle non-Error values thrown by AsyncStorage in getRemainingAttempts', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce('non-error');

      const remaining = await getRemainingAttempts('test@example.com');

      // Should return maxAttempts on error
      expect(remaining).toBe(5);
    });

    it('should handle invalid JSON in storage', async () => {
      await AsyncStorage.setItem('rateLimit_test@example.com', 'invalid-json');

      const remaining = await getRemainingAttempts('test@example.com');

      // Should return maxAttempts on error
      expect(remaining).toBe(5);
    });

    it('should not return negative remaining attempts', async () => {
      const key = 'test@example.com';
      
      // Make 10 attempts (exceeding max of 5)
      for (let i = 0; i < 10; i++) {
        await isRateLimited(key);
      }

      const remaining = await getRemainingAttempts(key);
      expect(remaining).toBe(0); // Should be 0, not negative
    });
  });

  describe('getTimeUntilReset', () => {
    it('should return 0 when no record exists', async () => {
      const timeUntilReset = await getTimeUntilReset('test@example.com');

      expect(timeUntilReset).toBe(0);
    });

    it('should return time until reset', async () => {
      const key = 'test@example.com';
      const windowMs = 15 * 60 * 1000; // 15 minutes
      
      await isRateLimited(key);

      const timeUntilReset = await getTimeUntilReset(key, windowMs);

      // Should be close to windowMs (within 100ms tolerance)
      expect(timeUntilReset).toBeGreaterThan(windowMs - 100);
      expect(timeUntilReset).toBeLessThanOrEqual(windowMs);
    });

    it('should return 0 when window has expired', async () => {
      const key = 'test@example.com';
      const windowMs = 1000; // 1 second
      
      await isRateLimited(key, 5, windowMs);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const timeUntilReset = await getTimeUntilReset(key, windowMs);
      expect(timeUntilReset).toBe(0);
    });

    it('should use custom windowMs', async () => {
      const key = 'test@example.com';
      const customWindow = 5 * 60 * 1000; // 5 minutes
      
      await isRateLimited(key, 5, customWindow);

      const timeUntilReset = await getTimeUntilReset(key, customWindow);

      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(customWindow);
    });

    it('should handle AsyncStorage error gracefully', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      const timeUntilReset = await getTimeUntilReset('test@example.com');

      // Should return 0 on error
      expect(timeUntilReset).toBe(0);
    });

    it('should handle non-Error values thrown by AsyncStorage in getTimeUntilReset', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce('non-error');

      const timeUntilReset = await getTimeUntilReset('test@example.com');

      // Should return 0 on error
      expect(timeUntilReset).toBe(0);
    });

    it('should handle invalid JSON in storage', async () => {
      await AsyncStorage.setItem('rateLimit_test@example.com', 'invalid-json');

      const timeUntilReset = await getTimeUntilReset('test@example.com');

      // Should return 0 on error
      expect(timeUntilReset).toBe(0);
    });

    it('should not return negative time', async () => {
      const key = 'test@example.com';
      const windowMs = 1000;
      
      await isRateLimited(key, 5, windowMs);

      // Mock time to be way in the future
      const originalDateNow = Date.now;
      const farFuture = originalDateNow() + 100000;
      Date.now = jest.fn(() => farFuture);

      const timeUntilReset = await getTimeUntilReset(key, windowMs);
      expect(timeUntilReset).toBe(0); // Should be 0, not negative

      Date.now = originalDateNow;
    });
  });

  describe('edge cases', () => {
    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      const isLimited = await isRateLimited(longKey);

      expect(isLimited).toBe(false);
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'test+user@example.com';
      const isLimited = await isRateLimited(specialKey);

      expect(isLimited).toBe(false);
    });

    it('should handle concurrent rate limit checks', async () => {
      const key = 'test@example.com';
      
      const results = await Promise.all([
        isRateLimited(key),
        isRateLimited(key),
        isRateLimited(key),
      ]);

      // All should complete without error
      expect(results).toHaveLength(3);
      expect(results.every(r => typeof r === 'boolean')).toBe(true);
    });

    it('should handle zero maxAttempts', async () => {
      const key = 'test@example.com';
      const isLimited = await isRateLimited(key, 0);

      // With 0 max attempts, first attempt should be limited
      expect(isLimited).toBe(true);
    });

    it('should handle very small window', async () => {
      const key = 'test@example.com';
      const tinyWindow = 1; // 1ms
      
      await isRateLimited(key, 5, tinyWindow);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const isLimited = await isRateLimited(key, 5, tinyWindow);
      expect(isLimited).toBe(false);
    });
  });
});
