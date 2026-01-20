// Application Configuration
// Manages environment variables and app configuration

import Constants from 'expo-constants';

/**
 * Application environment
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
  const env = Constants.expoConfig?.extra?.environment || 
              process.env.NODE_ENV || 
              (__DEV__ ? 'development' : 'production');
  
  if (env === 'development' || env === 'dev') return 'development';
  if (env === 'staging' || env === 'stage') return 'staging';
  return 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development' || __DEV__;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Application configuration
 */
export const config = {
  environment: getEnvironment(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  
  // API Configuration (for future backend integration)
  apiUrl: Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '',
  
  // Feature Flags
  features: {
    enableLogging: isDevelopment() || Constants.expoConfig?.extra?.enableLogging === true,
    enableErrorReporting: isProduction() && Constants.expoConfig?.extra?.enableErrorReporting !== false,
    enableAnalytics: Constants.expoConfig?.extra?.enableAnalytics === true,
  },
  
  // Security Settings
  security: {
    sessionTimeout: parseInt(
      Constants.expoConfig?.extra?.sessionTimeout || 
      process.env.EXPO_PUBLIC_SESSION_TIMEOUT || 
      '3600000', // 1 hour in milliseconds
      10
    ),
    maxLoginAttempts: parseInt(
      Constants.expoConfig?.extra?.maxLoginAttempts || 
      process.env.EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS || 
      '5',
      10
    ),
    loginAttemptWindow: parseInt(
      Constants.expoConfig?.extra?.loginAttemptWindow || 
      process.env.EXPO_PUBLIC_LOGIN_ATTEMPT_WINDOW || 
      '900000', // 15 minutes in milliseconds
      10
    ),
  },
  
  // Performance Settings
  performance: {
    maxProfilesToLoad: parseInt(
      Constants.expoConfig?.extra?.maxProfilesToLoad || 
      process.env.EXPO_PUBLIC_MAX_PROFILES_TO_LOAD || 
      '100',
      10
    ),
    profilesPerPage: parseInt(
      Constants.expoConfig?.extra?.profilesPerPage || 
      process.env.EXPO_PUBLIC_PROFILES_PER_PAGE || 
      '20',
      10
    ),
  },
} as const;
