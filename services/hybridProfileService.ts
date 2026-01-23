/**
 * Hybrid Profile Service
 * 
 * Provides a unified profile interface that:
 * - Always saves to AsyncStorage (for offline support)
 * - Optionally syncs to Firebase (if configured)
 * - Gracefully handles Firebase errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/config/firebase.config';
import {
  createFirebaseProfile,
  updateFirebaseProfile,
  getFirebaseProfile,
  getAllFirebaseProfiles,
} from './firebaseProfileService';
import { getCurrentFirebaseUser } from './firebaseAuthService';
import { Profile } from '@/types/types';
import { logger } from '@/utils/logger';

/**
 * Create a new profile (hybrid: local + Firebase)
 */
export async function hybridCreateProfile(profile: Profile): Promise<void> {
  try {
    // Always save locally first
    await AsyncStorage.setItem('profile', JSON.stringify(profile));
    logger.info('Profile saved locally', { email: profile.email });

    // Add to allProfiles array
    const allProfilesData = await AsyncStorage.getItem('allProfiles');
    let allProfiles: Profile[] = allProfilesData ? JSON.parse(allProfilesData) : [];
    
    // Remove existing profile with same email if it exists
    allProfiles = allProfiles.filter((p) => p.email !== profile.email);
    
    // Add new profile
    allProfiles.push(profile);
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
    logger.info('Profile added to local allProfiles', { email: profile.email });

    // Try to sync to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        // Check if user is authenticated in Firebase
        const currentUser = getCurrentFirebaseUser();
        logger.info('Firebase auth status', { 
          isAuthenticated: !!currentUser,
          uid: currentUser?.uid,
          email: currentUser?.email,
          profileEmail: profile.email
        });
        
        if (!currentUser) {
          logger.warn('User not authenticated in Firebase, skipping sync', {
            email: profile.email,
            hint: 'Make sure to sign up/sign in with Firebase Auth before creating profile'
          });
        } else if (currentUser.email !== profile.email) {
          logger.warn('Firebase user email does not match profile email', {
            firebaseEmail: currentUser.email,
            profileEmail: profile.email,
            hint: 'Profile can only be created for the authenticated user'
          });
        } else {
          await createFirebaseProfile(profile);
          logger.info('Profile synced to Firebase', { email: profile.email });
        }
      } catch (firebaseError) {
        // Log but don't fail - local profile is already saved
        logger.warn('Failed to sync profile to Firebase, continuing with local only', {
          email: profile.email,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorName: firebaseError instanceof Error ? firebaseError.name : 'Unknown'
        });
      }
    } else {
      logger.info('Firebase not configured, profile saved locally only', { email: profile.email });
    }
  } catch (error) {
    logger.error('Error in hybrid create profile', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update a profile (hybrid: local + Firebase)
 */
export async function hybridUpdateProfile(email: string, updates: Partial<Profile>): Promise<void> {
  try {
    // Get current profile
    const profileData = await AsyncStorage.getItem('profile');
    if (!profileData) {
      throw new Error('Profile not found');
    }

    const currentProfile = JSON.parse(profileData);
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    await AsyncStorage.setItem('profile', JSON.stringify(updatedProfile));
    logger.info('Profile updated locally', { email });

    // Update in allProfiles array
    const allProfilesData = await AsyncStorage.getItem('allProfiles');
    if (allProfilesData) {
      let allProfiles: Profile[] = JSON.parse(allProfilesData);
      const index = allProfiles.findIndex((p) => p.email === email);
      if (index !== -1) {
        allProfiles[index] = updatedProfile;
        await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
        logger.info('Profile updated in local allProfiles', { email });
      }
    }

    // Try to sync to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        // Check if user is authenticated in Firebase
        const currentUser = getCurrentFirebaseUser();
        logger.info('Firebase auth status for update', { 
          isAuthenticated: !!currentUser,
          uid: currentUser?.uid,
          email: currentUser?.email,
          profileEmail: email
        });
        
        if (!currentUser) {
          logger.warn('User not authenticated in Firebase, skipping update sync', {
            email,
            hint: 'Make sure user is signed in with Firebase Auth before updating profile'
          });
        } else if (currentUser.email !== email) {
          logger.warn('Firebase user email does not match profile email for update', {
            firebaseEmail: currentUser.email,
            profileEmail: email,
            hint: 'Profile can only be updated by the authenticated user'
          });
        } else {
          await updateFirebaseProfile(email, updates);
          logger.info('Profile update synced to Firebase', { email });
        }
      } catch (firebaseError) {
        // Log but don't fail - local profile is already updated
        logger.warn('Failed to sync profile update to Firebase, continuing with local only', {
          email,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorName: firebaseError instanceof Error ? firebaseError.name : 'Unknown'
        });
      }
    } else {
      logger.info('Firebase not configured, profile updated locally only', { email });
    }
  } catch (error) {
    logger.error('Error in hybrid update profile', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get a profile (hybrid: try Firebase first, fallback to local)
 */
export async function hybridGetProfile(email: string): Promise<Profile | null> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const firebaseProfile = await getFirebaseProfile(email);
        if (firebaseProfile) {
          logger.info('Profile retrieved from Firebase', { email });
          return firebaseProfile;
        }
      } catch (firebaseError) {
        logger.warn('Failed to get profile from Firebase, trying local', {
          email,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError)
        });
      }
    }

    // Fallback to local storage
    const profileData = await AsyncStorage.getItem('profile');
    if (profileData) {
      const profile = JSON.parse(profileData);
      if (profile.email === email) {
        logger.info('Profile retrieved from local storage', { email });
        return profile;
      }
    }

    // Check allProfiles
    const allProfilesData = await AsyncStorage.getItem('allProfiles');
    if (allProfilesData) {
      const allProfiles: Profile[] = JSON.parse(allProfilesData);
      const profile = allProfiles.find((p) => p.email === email);
      if (profile) {
        logger.info('Profile found in local allProfiles', { email });
        return profile;
      }
    }

    logger.info('Profile not found', { email });
    return null;
  } catch (error) {
    logger.error('Error in hybrid get profile', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all profiles (hybrid: merge Firebase and local)
 */
export async function hybridGetAllProfiles(): Promise<Profile[]> {
  try {
    const profiles: Profile[] = [];
    const emailSet = new Set<string>();

    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const firebaseProfiles = await getAllFirebaseProfiles();
        firebaseProfiles.forEach((profile) => {
          profiles.push(profile);
          emailSet.add(profile.email);
        });
        logger.info('Retrieved profiles from Firebase', { count: firebaseProfiles.length });
      } catch (firebaseError) {
        logger.warn('Failed to get profiles from Firebase, using local only', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError)
        });
      }
    }

    // Add local profiles that aren't already in the list
    const allProfilesData = await AsyncStorage.getItem('allProfiles');
    if (allProfilesData) {
      const localProfiles: Profile[] = JSON.parse(allProfilesData);
      localProfiles.forEach((profile) => {
        if (!emailSet.has(profile.email)) {
          profiles.push(profile);
          emailSet.add(profile.email);
        }
      });
      logger.info('Merged local profiles', { totalCount: profiles.length });
    }

    return profiles;
  } catch (error) {
    logger.error('Error in hybrid get all profiles', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check if Firebase sync is available
 */
export function isFirebaseSyncAvailable(): boolean {
  return isFirebaseConfigured();
}
