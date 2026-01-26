/**
 * Sync Local Profile to Firestore
 * 
 * This script helps sync a profile from local storage to Firestore
 * when the user exists in Firebase Auth but profile is missing in Firestore.
 * 
 * Usage: Run this from the app after logging in, or use as a utility function
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirebase } from '@/config/firebase.config';
import { getCurrentFirebaseUser } from '@/services/firebaseAuthService';
import { createFirebaseProfile } from '@/services/firebaseProfileService';
import { logger } from '@/utils/logger';
import { safeParseJSON, validateProfileSchema } from '@/utils/schemaValidation';
import { Profile } from '@/types/types';

/**
 * Sync profile from local storage to Firestore
 * Call this after user logs in if profile exists locally but not in Firestore
 */
export async function syncProfileToFirestore(email: string): Promise<boolean> {
  try {
    // Initialize Firebase
    initializeFirebase();

    // Check if user is authenticated
    const currentUser = getCurrentFirebaseUser();
    if (!currentUser) {
      logger.warn('User not authenticated in Firebase', { email });
      return false;
    }

    if (currentUser.email !== email) {
      logger.warn('Firebase user email does not match', {
        firebaseEmail: currentUser.email,
        requestedEmail: email,
      });
      return false;
    }

    // Get profile from local storage
    const profileData = await AsyncStorage.getItem('profile');
    if (!profileData) {
      logger.warn('No profile found in local storage', { email });
      return false;
    }

    const profile = safeParseJSON<Profile>(
      profileData,
      validateProfileSchema,
      null
    );

    if (!profile) {
      logger.warn('Invalid profile data in local storage', { email });
      return false;
    }

    if (profile.email !== email) {
      logger.warn('Profile email does not match requested email', {
        profileEmail: profile.email,
        requestedEmail: email,
      });
      return false;
    }

    // Try to create profile in Firestore
    await createFirebaseProfile(profile);
    logger.info('Profile synced to Firestore successfully', { email });
    return true;
  } catch (error) {
    logger.error('Error syncing profile to Firestore', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
