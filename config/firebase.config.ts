/**
 * Firebase Configuration
 * 
 * This file initializes Firebase services for the MentorMatch app.
 * 
 * IMPORTANT: After creating your Firebase project, replace the placeholders
 * in this file with your actual Firebase config values from the Firebase Console.
 * 
 * To get your config:
 * 1. Go to https://console.firebase.google.com/
 * 2. Select your project
 * 3. Go to Project Settings > General
 * 4. Scroll to "Your apps" section
 * 5. Click on the web app icon or "Add app" if you haven't created one
 * 6. Copy the firebaseConfig object
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

/**
 * Firebase configuration object
 * Replace these placeholder values with your actual Firebase project config
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

/**
 * Firebase app instance
 */
let app: FirebaseApp;

/**
 * Firebase Authentication instance
 */
let auth: Auth;

/**
 * Firestore database instance
 */
let db: Firestore;

/**
 * Initialize Firebase
 * Only initializes once, even if called multiple times
 */
export function initializeFirebase(): void {
  try {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      logger.info('Firebase initialized successfully');
      
      // Initialize Auth with AsyncStorage persistence for React Native
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      logger.info('Firebase Auth initialized with AsyncStorage persistence');
    } else {
      app = getApps()[0];
      auth = getAuth(app);
      logger.info('Firebase already initialized');
    }

    // Initialize Firestore
    db = getFirestore(app);
  } catch (error) {
    logger.error('Error initializing Firebase', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get Firebase Authentication instance
 * @returns Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

/**
 * Get Firestore database instance
 * @returns Firestore instance
 */
export function getFirebaseFirestore(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

/**
 * Check if Firebase is configured
 * @returns true if Firebase is properly configured, false otherwise
 */
export function isFirebaseConfigured(): boolean {
  return (
    firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID' &&
    firebaseConfig.appId !== 'YOUR_APP_ID'
  );
}

// Export config for reference
export { firebaseConfig };
