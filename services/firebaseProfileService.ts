/**
 * Firebase Profile Service
 * 
 * Handles all profile-related operations with Firestore
 * This service can be used alongside or to replace the local AsyncStorage-based profileService
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';
import { Profile } from '@/types/types';
import { logger } from '@/utils/logger';

const PROFILES_COLLECTION = 'profiles';

/**
 * Get Firestore profiles collection reference
 */
function getProfilesCollection() {
  const db = getFirebaseFirestore();
  return collection(db, PROFILES_COLLECTION);
}

/**
 * Create a new profile in Firestore
 */
export async function createFirebaseProfile(profile: Profile): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const profileRef = doc(db, PROFILES_COLLECTION, profile.email);
    
    await setDoc(profileRef, {
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    logger.info('Profile created in Firestore', { email: profile.email });
  } catch (error) {
    logger.error('Error creating profile in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get a profile by email from Firestore
 */
export async function getFirebaseProfile(email: string): Promise<Profile | null> {
  try {
    const db = getFirebaseFirestore();
    const profileRef = doc(db, PROFILES_COLLECTION, email);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const data = profileSnap.data() as Profile;
      logger.info('Profile retrieved from Firestore', { email });
      return data;
    }
    
    logger.info('Profile not found in Firestore', { email });
    return null;
  } catch (error) {
    logger.error('Error getting profile from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update a profile in Firestore
 */
export async function updateFirebaseProfile(email: string, updates: Partial<Profile>): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const profileRef = doc(db, PROFILES_COLLECTION, email);
    
    await updateDoc(profileRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    logger.info('Profile updated in Firestore', { email });
  } catch (error) {
    logger.error('Error updating profile in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete a profile from Firestore
 */
export async function deleteFirebaseProfile(email: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const profileRef = doc(db, PROFILES_COLLECTION, email);
    
    await deleteDoc(profileRef);
    
    logger.info('Profile deleted from Firestore', { email });
  } catch (error) {
    logger.error('Error deleting profile from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all profiles from Firestore
 * @param limitCount Optional limit on number of profiles to fetch
 */
export async function getAllFirebaseProfiles(limitCount?: number): Promise<Profile[]> {
  try {
    const profilesCol = getProfilesCollection();
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    
    if (limitCount) {
      constraints.push(limit(limitCount));
    }
    
    const q = query(profilesCol, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const profiles: Profile[] = [];
    querySnapshot.forEach((doc) => {
      profiles.push(doc.data() as Profile);
    });
    
    logger.info('Profiles retrieved from Firestore', { count: profiles.length });
    return profiles;
  } catch (error) {
    logger.error('Error getting all profiles from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Search profiles by expertise or interest
 */
export async function searchFirebaseProfiles(searchTerm: string): Promise<Profile[]> {
  try {
    const profilesCol = getProfilesCollection();
    
    // Note: Firestore doesn't support full-text search natively
    // For production, consider using Algolia or Elasticsearch for better search
    // This is a simple case-insensitive search on expertise field
    const q = query(
      profilesCol,
      where('expertise', '>=', searchTerm),
      where('expertise', '<=', searchTerm + '\uf8ff'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    
    const profiles: Profile[] = [];
    querySnapshot.forEach((doc) => {
      profiles.push(doc.data() as Profile);
    });
    
    logger.info('Profiles searched in Firestore', { searchTerm, count: profiles.length });
    return profiles;
  } catch (error) {
    logger.error('Error searching profiles in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get profiles by expertise domain
 */
export async function getFirebaseProfilesByExpertise(expertise: string): Promise<Profile[]> {
  try {
    const profilesCol = getProfilesCollection();
    const q = query(
      profilesCol,
      where('expertise', '==', expertise),
      orderBy('expertiseYears', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    
    const profiles: Profile[] = [];
    querySnapshot.forEach((doc) => {
      profiles.push(doc.data() as Profile);
    });
    
    logger.info('Profiles by expertise retrieved from Firestore', { expertise, count: profiles.length });
    return profiles;
  } catch (error) {
    logger.error('Error getting profiles by expertise from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
