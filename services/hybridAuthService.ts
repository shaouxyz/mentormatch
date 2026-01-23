/**
 * Hybrid Authentication Service
 * 
 * Provides a unified authentication interface that:
 * - Always saves to AsyncStorage (for offline support)
 * - Optionally syncs to Firebase (if configured)
 * - Gracefully handles Firebase errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/config/firebase.config';
import { firebaseSignUp, firebaseSignIn } from './firebaseAuthService';
import { createUser as createLocalUser, authenticateUser as authenticateLocalUser } from '@/utils/userManagement';
import { logger } from '@/utils/logger';

/**
 * Sign up a new user (hybrid: local + Firebase)
 */
export async function hybridSignUp(email: string, password: string): Promise<any> {
  try {
    // Always create user locally first
    const localUser = await createLocalUser(email, password);
    logger.info('User created locally', { email });

    // Try to sync to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        logger.info('Attempting Firebase signup', { email });
        const firebaseUser = await firebaseSignUp(email, password);
        logger.info('User synced to Firebase', { 
          email,
          uid: firebaseUser.user?.uid,
          firebaseEmail: firebaseUser.user?.email
        });
      } catch (firebaseError) {
        // Log but don't fail - local user is already created
        logger.warn('Failed to sync user to Firebase, continuing with local only', {
          email,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorCode: (firebaseError as any)?.code,
          errorName: firebaseError instanceof Error ? firebaseError.name : 'Unknown'
        });
      }
    } else {
      logger.info('Firebase not configured, using local storage only', { email });
    }

    return localUser;
  } catch (error) {
    logger.error('Error in hybrid signup', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Sign in a user (hybrid: local + Firebase)
 */
export async function hybridSignIn(email: string, password: string): Promise<any> {
  try {
    // Try local authentication first
    const localUser = await authenticateLocalUser(email, password);
    logger.info('User authenticated locally', { email });

    // Try to sync with Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        logger.info('Attempting Firebase signin', { email });
        const firebaseUser = await firebaseSignIn(email, password);
        logger.info('User authenticated with Firebase', { 
          email,
          uid: firebaseUser.user?.uid,
          firebaseEmail: firebaseUser.user?.email
        });
      } catch (firebaseError) {
        // Log but don't fail - local authentication succeeded
        logger.warn('Failed to authenticate with Firebase, continuing with local only', {
          email,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorCode: (firebaseError as any)?.code,
          errorName: firebaseError instanceof Error ? firebaseError.name : 'Unknown'
        });
      }
    } else {
      logger.info('Firebase not configured, signin using local storage only', { email });
    }

    return localUser;
  } catch (error) {
    logger.error('Error in hybrid signin', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check if Firebase sync is available
 */
export function isFirebaseSyncAvailable(): boolean {
  return isFirebaseConfigured();
}
