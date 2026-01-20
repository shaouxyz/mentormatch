// Session Management Utilities
// Handles user session timeout and expiration

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from './security';
import { logger } from './logger';
import { config } from './config';
import { clearCurrentUser } from './userManagement';

const SESSION_START_KEY = 'sessionStartTime';
const LAST_ACTIVITY_KEY = 'lastActivityTime';

/**
 * Initialize user session
 */
export async function startSession(): Promise<void> {
  try {
    const now = Date.now();
    await SecureStorage.setItem(SESSION_START_KEY, now.toString());
    await SecureStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    logger.info('Session started', { timestamp: now });
  } catch (error) {
    logger.error('Failed to start session', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity(): Promise<void> {
  try {
    const now = Date.now();
    await SecureStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  } catch (error) {
    logger.error('Failed to update last activity', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Check if session is still valid
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const lastActivityStr = await SecureStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivityStr) {
      return false;
    }

    const lastActivity = parseInt(lastActivityStr, 10);
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;

    // Check if session has expired
    if (timeSinceLastActivity > config.security.sessionTimeout) {
      logger.info('Session expired', { 
        lastActivity, 
        now, 
        timeout: config.security.sessionTimeout 
      });
      await endSession();
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to check session validity', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get session age in milliseconds
 */
export async function getSessionAge(): Promise<number> {
  try {
    const sessionStartStr = await SecureStorage.getItem(SESSION_START_KEY);
    if (!sessionStartStr) {
      return 0;
    }

    const sessionStart = parseInt(sessionStartStr, 10);
    return Date.now() - sessionStart;
  } catch (error) {
    logger.error('Failed to get session age', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Get time until session expires in milliseconds
 */
export async function getTimeUntilExpiration(): Promise<number> {
  try {
    const lastActivityStr = await SecureStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivityStr) {
      return 0;
    }

    const lastActivity = parseInt(lastActivityStr, 10);
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;
    const timeUntilExpiration = config.security.sessionTimeout - timeSinceLastActivity;

    return Math.max(0, timeUntilExpiration);
  } catch (error) {
    logger.error('Failed to get time until expiration', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * End user session
 */
export async function endSession(): Promise<void> {
  try {
    await SecureStorage.removeItem(SESSION_START_KEY);
    await SecureStorage.removeItem(LAST_ACTIVITY_KEY);
    await clearCurrentUser();
    await AsyncStorage.removeItem('isAuthenticated');
    logger.info('Session ended');
  } catch (error) {
    logger.error('Failed to end session', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Check and refresh session if needed
 * Call this periodically or on app focus
 */
export async function refreshSession(): Promise<boolean> {
  const isValid = await isSessionValid();
  if (isValid) {
    await updateLastActivity();
    return true;
  }
  return false;
}
