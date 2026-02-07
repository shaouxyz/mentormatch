/**
 * Account service – suspend and delete account
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/config/firebase.config';
import { endSession } from '@/utils/sessionManager';
import { removeUserByEmail } from '@/utils/userManagement';
import { deleteCurrentFirebaseUser } from './firebaseAuthService';
import { firebaseSignOut } from './firebaseAuthService';
import { updateFirebaseProfile, deleteFirebaseProfile } from './firebaseProfileService';
import { logger } from '@/utils/logger';

const LOCAL_KEYS = ['user', 'profile', 'allProfiles', 'conversations', 'messages', 'isAuthenticated'] as const;

/**
 * Clear all user data from local storage and end session.
 * Does not touch Firebase (use suspendAccount or deleteAccount for that).
 */
export async function clearAllUserData(): Promise<void> {
  await endSession();
  for (const key of LOCAL_KEYS) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      logger.warn('Failed to remove key', { key, error: e instanceof Error ? e.message : String(e) });
    }
  }
  if (isFirebaseConfigured()) {
    try {
      await firebaseSignOut();
    } catch (e) {
      logger.warn('Firebase sign out during clear', { error: e instanceof Error ? e.message : String(e) });
    }
  }
  logger.info('All user data cleared');
}

/**
 * Unsuspend account: clear suspended flag in Firestore.
 * Used when a suspended user confirms they want to sign in again.
 */
export async function unsuspendAccount(email: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await updateFirebaseProfile(email, { suspended: false });
      logger.info('Account unsuspended in Firestore', { email });
    } catch (e) {
      logger.error('Failed to unsuspend account in Firestore', e instanceof Error ? e : new Error(String(e)));
      throw e;
    }
  }
}

/**
 * Suspend account: set suspended flag in Firestore, then clear local data and sign out.
 * User will not be able to use the app until the account is unsuspended (e.g. by support).
 */
export async function suspendAccount(email: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await updateFirebaseProfile(email, {
        suspended: true,
        suspendedAt: new Date().toISOString(),
      });
      logger.info('Account suspended in Firestore', { email });
    } catch (e) {
      logger.error('Failed to suspend account in Firestore', e instanceof Error ? e : new Error(String(e)));
      throw e;
    }
  }
  await clearAllUserData();
}

/**
 * Permanently delete account: delete Firestore profile, delete Firebase user (if any),
 * remove local user so they cannot log in again, then clear all local data.
 */
export async function deleteAccount(email: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await deleteFirebaseProfile(email);
      logger.info('Profile deleted from Firestore', { email });
    } catch (e) {
      logger.warn('Failed to delete profile from Firestore', { email, error: e instanceof Error ? e.message : String(e) });
    }
    try {
      await deleteCurrentFirebaseUser();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('requires-recent-login')) {
        logger.warn('Delete requires recent login; clearing local data only', { email });
      } else {
        logger.warn('Failed to delete Firebase user', { error: msg });
      }
    }
  }
  try {
    await removeUserByEmail(email);
  } catch (e) {
    logger.warn('Failed to remove local user', { email, error: e instanceof Error ? e.message : String(e) });
  }
  await clearAllUserData();
}
