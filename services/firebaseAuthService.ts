/**
 * Firebase Authentication Service
 * 
 * Handles user authentication with Firebase Auth
 * This service can be used alongside or to replace the local AsyncStorage-based authentication
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/config/firebase.config';
import { logger } from '@/utils/logger';

/**
 * Sign up a new user with email and password
 */
export async function firebaseSignUp(
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    logger.info('User signed up with Firebase', { email });
    return userCredential;
  } catch (error) {
    logger.error('Error signing up with Firebase', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Sign in an existing user with email and password
 */
export async function firebaseSignIn(email: string, password: string): Promise<UserCredential> {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    logger.info('User signed in with Firebase', { email });
    return userCredential;
  } catch (error) {
    logger.error('Error signing in with Firebase', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function firebaseSignOut(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
    
    logger.info('User signed out from Firebase');
  } catch (error) {
    logger.error('Error signing out from Firebase', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get the currently authenticated user
 */
export function getCurrentFirebaseUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

/**
 * Send password reset email
 */
export async function firebaseSendPasswordReset(email: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
    
    logger.info('Password reset email sent', { email });
  } catch (error) {
    logger.error('Error sending password reset email', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update user profile
 */
export async function firebaseUpdateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    await updateProfile(user, updates);
    
    logger.info('User profile updated in Firebase', { uid: user.uid });
  } catch (error) {
    logger.error('Error updating user profile in Firebase', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check if a user is currently signed in
 */
export function isFirebaseUserSignedIn(): boolean {
  const auth = getFirebaseAuth();
  return auth.currentUser !== null;
}

/**
 * Get user ID token (useful for authenticating API requests)
 */
export async function getFirebaseUserToken(): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    logger.error('Error getting Firebase user token', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
