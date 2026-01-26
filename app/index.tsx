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
          // Initialize Firebase first (if configured)
          try {
            initializeFirebase();
            logger.info('Firebase initialized at app startup');
          } catch (error) {
            logger.warn('Firebase initialization failed at app startup, continuing with local only', {
              error: error instanceof Error ? error.message : String(error)
            });
          }
          // Initialize data migration
          initializeDataMigration().catch((error) => {
            logger.error('Failed to initialize data migration', error instanceof Error ? error : new Error(String(error)));
          });
          // Then initialize test accounts
          initializeTestAccounts().catch((error) => {
            logger.error('Failed to initialize test accounts', error instanceof Error ? error : new Error(String(error)));
          });
          // CASPA profiles initialization is now lazy - call initializeCaspaProfiles() manually when needed
          // This improves app startup performance
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
