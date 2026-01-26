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
 * Sign in a user (hybrid: Firebase first, then local fallback)
 */
export async function hybridSignIn(email: string, password: string): Promise<any> {
  try {
    // Try Firebase authentication first if configured
    if (isFirebaseConfigured()) {
      try {
        logger.info('Attempting Firebase signin first', { email });
        const firebaseUser = await firebaseSignIn(email, password);
        logger.info('User authenticated with Firebase', { 
          email,
          uid: firebaseUser.user?.uid,
          firebaseEmail: firebaseUser.user?.email
        });
        
        // Ensure user exists locally for offline support
        try {
          const localUser = await authenticateLocalUser(email, password);
          logger.info('User also authenticated locally', { email });
          return localUser;
        } catch (localError) {
          // If local auth fails, create local user with Firebase credentials
          logger.info('Creating local user from Firebase authentication', { email });
          const localUser = await createLocalUser(email, password);
          logger.info('Local user created from Firebase auth', { email });
          return localUser;
        }
      } catch (firebaseError: any) {
        // Firebase authentication failed, try local fallback
        logger.warn('Firebase signin failed, trying local authentication', {
          email,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorCode: firebaseError?.code,
        });
        
        // Fall back to local authentication
        try {
          const localUser = await authenticateLocalUser(email, password);
          logger.info('User authenticated locally (Firebase unavailable)', { email });
          
          // If user doesn't exist in Firebase but exists locally, try to create them
          if (firebaseError?.code === 'auth/user-not-found' || firebaseError?.code === 'auth/invalid-credential') {
            try {
              logger.info('User not found in Firebase, creating Firebase account for existing local user', { email });
              const firebaseUser = await firebaseSignUp(email, password);
              logger.info('Firebase account created for existing local user', { 
                email,
                uid: firebaseUser.user?.uid,
                firebaseEmail: firebaseUser.user?.email
              });
            } catch (createError) {
              // If creation fails, just log and continue with local only
              logger.warn('Failed to create Firebase account for existing local user', {
                email,
                error: createError instanceof Error ? createError.message : String(createError),
                errorCode: (createError as any)?.code,
              });
            }
          }
          
          return localUser;
        } catch (localError) {
          // Both Firebase and local authentication failed
          logger.error('Both Firebase and local authentication failed', {
            email,
            firebaseError: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
            localError: localError instanceof Error ? localError.message : String(localError),
          });
          throw localError; // Throw the local error as it's the final fallback
        }
      }
    } else {
      // Firebase not configured, use local storage only
      logger.info('Firebase not configured, using local storage only', { email });
      const localUser = await authenticateLocalUser(email, password);
      logger.info('User authenticated locally', { email });
      return localUser;
    }
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
