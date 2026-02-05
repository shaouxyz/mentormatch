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
        const errorCode = firebaseError?.code || 'unknown';
        const errorMessage = firebaseError instanceof Error ? firebaseError.message : String(firebaseError);
        
        logger.warn('Firebase signin failed, trying local authentication', {
          email,
          error: errorMessage,
          errorCode,
          fullError: firebaseError,
        });
        
        // Fall back to local authentication
        try {
          // Check if user exists locally first
          const { getUserByEmail } = await import('@/utils/userManagement');
          const localUserExists = await getUserByEmail(email);
          
          if (!localUserExists) {
            logger.warn('User does not exist locally either', {
              email,
              firebaseErrorCode: errorCode,
              firebaseErrorMessage: errorMessage
            });
            // User doesn't exist in either place - throw error
            const notFoundError = new Error(
              `User not found. Please sign up first or check your email address.`
            );
            (notFoundError as any).firebaseErrorCode = errorCode;
            (notFoundError as any).firebaseError = errorMessage;
            throw notFoundError;
          }
          
          const localUser = await authenticateLocalUser(email, password);
          logger.info('User authenticated locally (Firebase unavailable)', { 
            email,
            firebaseErrorCode: errorCode,
            firebaseErrorMessage: errorMessage
          });
          
          // If user doesn't exist in Firebase but exists locally, try to create them
          if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
            try {
              logger.info('User not found in Firebase, attempting to create Firebase account for existing local user', { 
                email,
                firebaseErrorCode: errorCode
              });
              const firebaseUser = await firebaseSignUp(email, password);
              logger.info('Firebase account created for existing local user', { 
                email,
                uid: firebaseUser.user?.uid,
                firebaseEmail: firebaseUser.user?.email
              });
            } catch (createError: any) {
              // If creation fails (e.g., email already exists), just log and continue with local only
              const createErrorCode = createError?.code || 'unknown';
              logger.warn('Failed to create Firebase account for existing local user', {
                email,
                error: createError instanceof Error ? createError.message : String(createError),
                errorCode: createErrorCode,
                reason: createErrorCode === 'auth/email-already-in-use' 
                  ? 'Email already exists in Firebase (may have been created by another device)' 
                  : 'Unknown error during Firebase account creation'
              });
            }
          } else if (errorCode === 'auth/wrong-password') {
            // Password is wrong in Firebase, but might be correct locally
            logger.warn('Firebase password is wrong, but local authentication succeeded', {
              email,
              firebaseErrorCode: errorCode
            });
            // Continue with local authentication
          }
          
          return localUser;
        } catch (localError) {
          // Both Firebase and local authentication failed
          const localErrorMessage = localError instanceof Error ? localError.message : String(localError);
          logger.error('Both Firebase and local authentication failed', {
            email,
            firebaseError: errorMessage,
            firebaseErrorCode: errorCode,
            localError: localErrorMessage,
          });
          
          // Create a more descriptive error message
          const combinedError = new Error(
            `Login failed: ${localErrorMessage}. ` +
            `Firebase error: ${errorCode} - ${errorMessage}. ` +
            `Please check your email and password, or sign up if you don't have an account.`
          );
          (combinedError as any).firebaseErrorCode = errorCode;
          (combinedError as any).firebaseError = errorMessage;
          throw combinedError;
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
