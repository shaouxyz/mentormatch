// Profile Service Layer
// Separates business logic from UI components for profile operations

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { safeParseJSON, validateProfileSchema } from '../utils/schemaValidation';
import { STORAGE_KEYS } from '../utils/constants';
import { Profile } from '../types/types';

/**
 * Get current user's profile from storage
 * 
 * @returns {Promise<Profile | null>} Current user's profile or null if not found
 * @throws {Error} If storage read fails
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!profileData) {
      return null;
    }
    return safeParseJSON(profileData, validateProfileSchema, null);
  } catch (error) {
    logger.error('Error getting current profile', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Save current user's profile to storage
 * 
 * Also updates the profile in the allProfiles array to ensure
 * it's discoverable by other users.
 * 
 * @param {Profile} profile - The profile data to save
 * @throws {Error} If profile is invalid or storage write fails
 */
export async function saveProfile(profile: Profile): Promise<void> {
  try {
    // Validate profile before saving
    if (!validateProfileSchema(profile)) {
      throw new Error('Invalid profile data');
    }

    // Save profile
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));

    // Update allProfiles array
    const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
    const allProfiles: Profile[] = allProfilesData
      ? safeParseJSON(
          allProfilesData,
          (data): data is Profile[] => Array.isArray(data) && data.every(validateProfileSchema),
          []
        ) || []
      : [];

    // Remove existing profile with same email if exists
    const filteredProfiles = allProfiles.filter(p => p.email !== profile.email);
    
    // Add updated profile
    filteredProfiles.push(profile);

    // Save updated allProfiles
    await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(filteredProfiles));

    logger.info('Profile saved successfully', { email: profile.email });
  } catch (error) {
    logger.error('Error saving profile', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all profiles from storage (for discover page)
 * 
 * @param {string} [excludeEmail] - Optional email to exclude from results
 * @returns {Promise<Profile[]>} Array of all profiles, optionally excluding specified email
 */
export async function getAllProfiles(excludeEmail?: string): Promise<Profile[]> {
  try {
    const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
    const allProfiles: Profile[] = allProfilesData
      ? safeParseJSON(
          allProfilesData,
          (data): data is Profile[] => Array.isArray(data) && data.every(validateProfileSchema),
          []
        ) || []
      : [];

    // Filter out current user's profile if excludeEmail is provided
    if (excludeEmail) {
      return allProfiles.filter(p => p.email !== excludeEmail);
    }

    return allProfiles;
  } catch (error) {
    logger.error('Error getting all profiles', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get a specific profile by email address
 * 
 * @param {string} email - Email address of the profile to retrieve
 * @returns {Promise<Profile | null>} Profile matching the email or null if not found
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  try {
    const allProfiles = await getAllProfiles();
    return allProfiles.find(p => p.email === email) || null;
  } catch (error) {
    logger.error('Error getting profile by email', error instanceof Error ? error : new Error(String(error)), { email });
    return null;
  }
}

/**
 * Delete a profile from storage
 * 
 * Removes the profile from both the profile storage and allProfiles array.
 * Also removes from current profile storage if it's the current user's profile.
 * 
 * @param {string} email - Email address of the profile to delete
 * @throws {Error} If deletion fails
 */
export async function deleteProfile(email: string): Promise<void> {
  try {
    // Remove from allProfiles
    const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
    const allProfiles: Profile[] = allProfilesData
      ? safeParseJSON(
          allProfilesData,
          (data): data is Profile[] => Array.isArray(data) && data.every(validateProfileSchema),
          []
        ) || []
      : [];

    const filteredProfiles = allProfiles.filter(p => p.email !== email);
    await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(filteredProfiles));

    // If it's the current user's profile, also remove from profile storage
    const currentProfile = await getCurrentProfile();
    if (currentProfile?.email === email) {
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE);
    }

    logger.info('Profile deleted successfully', { email });
  } catch (error) {
    logger.error('Error deleting profile', error instanceof Error ? error : new Error(String(error)), { email });
    throw error;
  }
}
