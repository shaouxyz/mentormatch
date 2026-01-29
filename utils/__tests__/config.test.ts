/**
 * Config Tests
 * 
 * Tests for utils/config.ts - application configuration
 */

import Constants from 'expo-constants';
import { getEnvironment, isDevelopment, isProduction, config } from '../config';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock __DEV__
const originalDev = global.__DEV__;

describe('Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset __DEV__
    global.__DEV__ = true;
    // Reset process.env
    delete process.env.NODE_ENV;
    // Reset Constants.expoConfig.extra
    (Constants.expoConfig as any).extra = {};
  });

  afterAll(() => {
    global.__DEV__ = originalDev;
  });

  describe('getEnvironment', () => {
    it('should return development when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(getEnvironment()).toBe('development');
    });

    it('should return development when NODE_ENV is dev', () => {
      process.env.NODE_ENV = 'dev';
      expect(getEnvironment()).toBe('development');
    });

    it('should return staging when NODE_ENV is staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(getEnvironment()).toBe('staging');
    });

    it('should return staging when NODE_ENV is stage', () => {
      process.env.NODE_ENV = 'stage';
      expect(getEnvironment()).toBe('staging');
    });

    it('should return production when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(getEnvironment()).toBe('production');
    });

    it('should return development when __DEV__ is true and NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      global.__DEV__ = true;
      expect(getEnvironment()).toBe('development');
    });

    it('should return production when __DEV__ is false and NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      global.__DEV__ = false;
      expect(getEnvironment()).toBe('production');
    });

    it('should use Constants.expoConfig.extra.environment if available', () => {
      (Constants.expoConfig as any).extra.environment = 'staging';
      expect(getEnvironment()).toBe('staging');
    });

    it('should prioritize Constants.expoConfig.extra.environment over NODE_ENV', () => {
      (Constants.expoConfig as any).extra.environment = 'production';
      process.env.NODE_ENV = 'development';
      expect(getEnvironment()).toBe('production');
    });
  });

  describe('isDevelopment', () => {
    it('should return true when environment is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('should return true when __DEV__ is true', () => {
      global.__DEV__ = true;
      delete process.env.NODE_ENV;
      expect(isDevelopment()).toBe(true);
    });

    it('should return false when environment is production', () => {
      process.env.NODE_ENV = 'production';
      global.__DEV__ = false;
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when environment is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('should return false when environment is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('should return false when environment is staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isProduction()).toBe(false);
    });
  });

  describe('config object', () => {
    it('should have environment property', () => {
      expect(config).toHaveProperty('environment');
      expect(typeof config.environment).toBe('string');
    });

    it('should have isDevelopment property', () => {
      expect(config).toHaveProperty('isDevelopment');
      expect(typeof config.isDevelopment).toBe('boolean');
    });

    it('should have isProduction property', () => {
      expect(config).toHaveProperty('isProduction');
      expect(typeof config.isProduction).toBe('boolean');
    });

    it('should have apiUrl property', () => {
      expect(config).toHaveProperty('apiUrl');
      expect(typeof config.apiUrl).toBe('string');
    });

    it('should use Constants.expoConfig.extra.apiUrl if available (has priority)', () => {
      // Constants.expoConfig.extra.apiUrl has priority over process.env
      const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
      process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
      
      // Use jest.doMock to dynamically update the mock
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {
              apiUrl: 'https://api.custom.com',
            },
          },
        },
      }));
      
      jest.resetModules();
      const { config: newConfig } = require('../config');
      // Constants.expoConfig.extra.apiUrl should take priority
      expect(newConfig.apiUrl).toBe('https://api.custom.com');
      
      // Restore
      jest.resetModules();
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));
      if (originalApiUrl) {
        process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
      } else {
        delete process.env.EXPO_PUBLIC_API_URL;
      }
    });

    it('should use EXPO_PUBLIC_API_URL from process.env if Constants.expoConfig.extra.apiUrl is not set', () => {
      // Clear Constants.expoConfig.extra.apiUrl to test process.env fallback
      delete (Constants.expoConfig as any).extra.apiUrl;
      process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
      
      jest.resetModules();
      const { config: newConfig } = require('../config');
      expect(newConfig.apiUrl).toBe('https://api.example.com');
      
      // Restore
      jest.resetModules();
      delete process.env.EXPO_PUBLIC_API_URL;
    });

    it('should have features object', () => {
      expect(config).toHaveProperty('features');
      expect(typeof config.features).toBe('object');
    });

    it('should have enableLogging in features', () => {
      expect(config.features).toHaveProperty('enableLogging');
      expect(typeof config.features.enableLogging).toBe('boolean');
    });

    it('should have enableErrorReporting in features', () => {
      expect(config.features).toHaveProperty('enableErrorReporting');
      expect(typeof config.features.enableErrorReporting).toBe('boolean');
    });

    it('should have enableAnalytics in features', () => {
      expect(config.features).toHaveProperty('enableAnalytics');
      expect(typeof config.features.enableAnalytics).toBe('boolean');
    });

    it('should have security object', () => {
      expect(config).toHaveProperty('security');
      expect(typeof config.security).toBe('object');
    });

    it('should have sessionTimeout in security', () => {
      expect(config.security).toHaveProperty('sessionTimeout');
      expect(typeof config.security.sessionTimeout).toBe('number');
      expect(config.security.sessionTimeout).toBeGreaterThan(0);
    });

    it('should use EXPO_PUBLIC_SESSION_TIMEOUT from process.env if available', () => {
      process.env.EXPO_PUBLIC_SESSION_TIMEOUT = '7200000';
      jest.resetModules();
      const { config: newConfig } = require('../config');
      expect(newConfig.security.sessionTimeout).toBe(7200000);
      jest.resetModules();
    });

    it('should have maxLoginAttempts in security', () => {
      expect(config.security).toHaveProperty('maxLoginAttempts');
      expect(typeof config.security.maxLoginAttempts).toBe('number');
      expect(config.security.maxLoginAttempts).toBeGreaterThan(0);
    });

    it('should use EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS from process.env if available', () => {
      process.env.EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS = '10';
      jest.resetModules();
      const { config: newConfig } = require('../config');
      expect(newConfig.security.maxLoginAttempts).toBe(10);
      jest.resetModules();
    });

    it('should have loginAttemptWindow in security', () => {
      expect(config.security).toHaveProperty('loginAttemptWindow');
      expect(typeof config.security.loginAttemptWindow).toBe('number');
      expect(config.security.loginAttemptWindow).toBeGreaterThan(0);
    });

    it('should use EXPO_PUBLIC_LOGIN_ATTEMPT_WINDOW from process.env if available', () => {
      process.env.EXPO_PUBLIC_LOGIN_ATTEMPT_WINDOW = '1800000';
      jest.resetModules();
      const { config: newConfig } = require('../config');
      expect(newConfig.security.loginAttemptWindow).toBe(1800000);
      jest.resetModules();
    });

    it('should have performance object', () => {
      expect(config).toHaveProperty('performance');
      expect(typeof config.performance).toBe('object');
    });

    it('should have maxProfilesToLoad in performance', () => {
      expect(config.performance).toHaveProperty('maxProfilesToLoad');
      expect(typeof config.performance.maxProfilesToLoad).toBe('number');
      expect(config.performance.maxProfilesToLoad).toBeGreaterThan(0);
    });

    it('should use EXPO_PUBLIC_MAX_PROFILES_TO_LOAD from process.env if available', () => {
      process.env.EXPO_PUBLIC_MAX_PROFILES_TO_LOAD = '200';
      jest.resetModules();
      const { config: newConfig } = require('../config');
      expect(newConfig.performance.maxProfilesToLoad).toBe(200);
      jest.resetModules();
    });

    it('should have profilesPerPage in performance', () => {
      expect(config.performance).toHaveProperty('profilesPerPage');
      expect(typeof config.performance.profilesPerPage).toBe('number');
      expect(config.performance.profilesPerPage).toBeGreaterThan(0);
    });

    it('should use EXPO_PUBLIC_PROFILES_PER_PAGE from process.env if available', () => {
      process.env.EXPO_PUBLIC_PROFILES_PER_PAGE = '30';
      jest.resetModules();
      const { config: newConfig } = require('../config');
      expect(newConfig.performance.profilesPerPage).toBe(30);
      jest.resetModules();
    });
  });
});
