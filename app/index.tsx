import { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { initializeTestAccounts } from '@/utils/testAccounts';
import { logger } from '@/utils/logger';
import { initializeDataMigration } from '@/utils/dataMigration';
import { refreshSession, isSessionValid } from '@/utils/sessionManager';
import { initializeFirebase } from '@/config/firebase.config';

/**
 * Welcome Screen Component
 * 
 * The initial screen shown when the app starts. Handles:
 * - Initial authentication check
 * - Data migration initialization
 * - Test account initialization
 * - CASPA member profiles initialization
 * - Navigation to home if user is already authenticated
 * 
 * @component
 * @returns {JSX.Element} Welcome screen with signup and login options
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const hasInitialized = useRef(false);

  useEffect(() => {
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          
          // LOG: Mark initialization start
          if (__DEV__) {
            console.log('[APP_INIT] Starting initialization');
          }
          
          // Initialize services asynchronously to avoid blocking app startup
          // Use InteractionManager to defer until after first render
          // This ensures UI renders before any initialization happens
          const initTimeout = setTimeout(async () => {
            try {
              // LOG: Firebase check start
              if (__DEV__) {
                console.log('[APP_INIT] Checking Firebase configuration');
              }
              
              // Initialize Firebase first (if configured) - only if properly configured
              // Use Promise.resolve to make require() async and non-blocking
              // This prevents any synchronous operations from blocking the app
              Promise.resolve()
                .then(() => {
                  try {
                    const firebaseModule = require('@/config/firebase.config');
                    if (firebaseModule.isFirebaseConfigured && firebaseModule.isFirebaseConfigured()) {
                      if (__DEV__) {
                        console.log('[APP_INIT] Firebase configured, initializing...');
                      }
                      firebaseModule.initializeFirebase();
                      logger.info('Firebase initialized at app startup');
                      if (__DEV__) {
                        console.log('[APP_INIT] Firebase initialized successfully');
                      }
                    } else {
                      if (__DEV__) {
                        console.log('[APP_INIT] Firebase not configured, skipping');
                      }
                    }
                  } catch (error) {
                    throw error;
                  }
                })
                .catch((error) => {
                  logger.warn('Firebase initialization skipped or failed at app startup, continuing with local only', {
                    error: error instanceof Error ? error.message : String(error)
                  });
                  if (__DEV__) {
                    console.log('[APP_INIT] Firebase initialization failed:', error);
                  }
                });
              
              // LOG: Data migration start
              if (__DEV__) {
                console.log('[APP_INIT] Starting data migration');
              }
              
              // Initialize data migration with timeout
              const migrationPromise = initializeDataMigration();
              const migrationTimeout = setTimeout(() => {
                if (__DEV__) {
                  console.warn('[APP_INIT] Data migration taking longer than expected');
                }
              }, 5000);
              
              migrationPromise
                .then(() => {
                  clearTimeout(migrationTimeout);
                  if (__DEV__) {
                    console.log('[APP_INIT] Data migration completed');
                  }
                })
                .catch((error) => {
                  clearTimeout(migrationTimeout);
                  logger.error('Failed to initialize data migration', error instanceof Error ? error : new Error(String(error)));
                  if (__DEV__) {
                    console.error('[APP_INIT] Data migration failed:', error);
                  }
                });
              
              // LOG: Test accounts start
              if (__DEV__) {
                console.log('[APP_INIT] Starting test accounts initialization');
              }
              
              // Then initialize test accounts with timeout
              const testAccountsPromise = initializeTestAccounts();
              const testAccountsTimeout = setTimeout(() => {
                if (__DEV__) {
                  console.warn('[APP_INIT] Test accounts initialization taking longer than expected');
                }
              }, 5000);
              
              testAccountsPromise
                .then(() => {
                  clearTimeout(testAccountsTimeout);
                  if (__DEV__) {
                    console.log('[APP_INIT] Test accounts initialized');
                  }
                })
                .catch((error) => {
                  clearTimeout(testAccountsTimeout);
                  logger.error('Failed to initialize test accounts', error instanceof Error ? error : new Error(String(error)));
                  if (__DEV__) {
                    console.error('[APP_INIT] Test accounts initialization failed:', error);
                  }
                });
              
              // LOG: Initialization complete
              if (__DEV__) {
                console.log('[APP_INIT] All initialization tasks started');
              }
            } catch (error) {
              logger.error('Error during app initialization', error instanceof Error ? error : new Error(String(error)));
              if (__DEV__) {
                console.error('[APP_INIT] Fatal initialization error:', error);
              }
            }
          }, 100); // Defer by 100ms to ensure first render completes
          
          // Cleanup timeout on unmount
          return () => {
            clearTimeout(initTimeout);
          };
        }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        try {
          // Check if session is still valid
          const sessionValid = await isSessionValid();
          if (!sessionValid) {
            // Session expired, clear auth state
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('isAuthenticated');
            return;
          }

          const user = await AsyncStorage.getItem('user');
          if (user) {
            // Refresh session on app focus
            await refreshSession();
            router.replace('/(tabs)/home');
          }
        } catch (error) {
          logger.error('Error checking auth', error instanceof Error ? error : new Error(String(error)));
        }
      };
      checkAuth();
    }, [router])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>MentorMatch</Text>
        <Text style={styles.subtitle}>Connect with mentors and mentees</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/signup')}
            accessibilityLabel="Sign up button"
            accessibilityHint="Tap to create a new account"
          >
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/login')}
            accessibilityLabel="Log in button"
            accessibilityHint="Tap to log in to your existing account"
          >
            <Text style={styles.secondaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '600',
  },
});
