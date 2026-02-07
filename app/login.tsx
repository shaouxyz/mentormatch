import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { initializeTestAccounts, getTestAccount } from '@/utils/testAccounts';
import { ERROR_MESSAGES } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { authenticateUser, setCurrentUser, createUser } from '@/utils/userManagement';
import { sanitizeEmail } from '@/utils/security';
import { isRateLimited, resetRateLimit, getRemainingAttempts } from '@/utils/rateLimiter';
import { startSession } from '@/utils/sessionManager';
import { hybridSignIn } from '@/services/hybridAuthService';
import { hybridGetProfile } from '@/services/hybridProfileService';
import { clearAllUserData, unsuspendAccount } from '@/services/accountService';
import { getCurrentFirebaseUser } from '@/services/firebaseAuthService';
import { createFirebaseProfile } from '@/services/firebaseProfileService';
import { Profile } from '@/types/types';
import { safeParseJSON, validateProfileSchema } from '@/utils/schemaValidation';

/**
 * Login Screen Component
 * 
 * Handles user authentication with:
 * - Email and password validation
 * - Rate limiting protection
 * - Test account support (t0, t1)
 * - Session management
 * - Secure password verification
 * 
 * @component
 * @returns {JSX.Element} Login form with email and password inputs
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize test accounts silently in background
    initializeTestAccounts().catch((error) => {
      logger.error('Failed to initialize test accounts', error instanceof Error ? error : new Error(String(error)));
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', ERROR_MESSAGES.FILL_ALL_FIELDS);
      return;
    }

    setLoading(true);

    try {
      // Sanitize email input
      const sanitizedEmail = sanitizeEmail(email);
      
      // Check rate limiting
      if (await isRateLimited(sanitizedEmail)) {
        Alert.alert(
          'Too Many Attempts',
          `Too many login attempts. Please try again later.`,
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      // First check test accounts (backward compatibility)
      const testAccount = await getTestAccount(sanitizedEmail);
      if (testAccount && testAccount.password === password) {
        // Login as test account - create user account for test account
        try {
          const testUser = await createUser(testAccount.email, testAccount.password);
          await setCurrentUser(testUser.email);
          
          // Reset rate limit on successful login
          await resetRateLimit(sanitizedEmail);
          
          // Start session
          await startSession();
          
          // Store user data for backward compatibility
          await AsyncStorage.setItem('user', JSON.stringify({
            email: testUser.email,
            id: testUser.id,
            createdAt: testUser.createdAt,
            isTestAccount: true,
          }));
        } catch (error) {
          // User might already exist, try to authenticate
          const authenticatedUser = await authenticateUser(sanitizedEmail, password);
          if (authenticatedUser) {
            await setCurrentUser(authenticatedUser.email);
            
            // Reset rate limit on successful login
            await resetRateLimit(sanitizedEmail);
            
            // Start session
            await startSession();
            
            await AsyncStorage.setItem('user', JSON.stringify({
              email: authenticatedUser.email,
              id: authenticatedUser.id,
              createdAt: authenticatedUser.createdAt,
              isTestAccount: true,
            }));
          } else {
            throw new Error('Test account authentication failed');
          }
        }
        
        // Set test profile if exists
        if (testAccount.profile) {
          await AsyncStorage.setItem('profile', JSON.stringify(testAccount.profile));
        }
        
        router.replace('/(tabs)/home');
        setLoading(false);
        return;
      }

      // Authenticate user with hybrid service (local + Firebase if configured)
      const user = await hybridSignIn(sanitizedEmail, password);
      
      if (!user || !user.email) {
        throw new Error('Authentication succeeded but user object is invalid');
      }
      
      // Reset rate limit on successful login
      await resetRateLimit(sanitizedEmail);
      
      // Set current user session
      try {
        await setCurrentUser(user.email);
      } catch (setUserError) {
        logger.error('Failed to set current user', {
          error: setUserError instanceof Error ? setUserError.message : String(setUserError),
          email: user.email
        });
        throw new Error(`Failed to set current user: ${setUserError instanceof Error ? setUserError.message : String(setUserError)}`);
      }
      
      // Start session
      try {
        await startSession();
      } catch (sessionError) {
        logger.error('Failed to start session', {
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
          email: user.email
        });
        throw new Error(`Failed to start session: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`);
      }
      
      // Store user data for backward compatibility (without password)
      try {
        await AsyncStorage.setItem('user', JSON.stringify({
          email: user.email,
          id: user.id,
          createdAt: user.createdAt,
        }));
      } catch (storageError) {
        logger.error('Failed to store user data', {
          error: storageError instanceof Error ? storageError.message : String(storageError),
          email: user.email
        });
        // Don't throw - this is not critical for login
      }
      
      // Check if profile exists (try Firebase first, then local)
      let profile: Profile | null = null;
      try {
        profile = await hybridGetProfile(user.email);
      } catch (profileError) {
        logger.warn('Failed to get profile, continuing without profile', {
          error: profileError instanceof Error ? profileError.message : String(profileError),
          email: user.email
        });
        // Don't throw - user can continue without profile
      }
      
      // If profile exists locally but not in Firebase, try to sync it
      if (!profile) {
        const localProfileData = await AsyncStorage.getItem('profile');
        if (localProfileData) {
          const localProfile = safeParseJSON<Profile>(
            localProfileData,
            validateProfileSchema,
            null
          );
          if (localProfile && localProfile.email === user.email) {
            logger.info('Found local profile but not in Firestore, attempting to sync', { email: user.email });
            // Try to sync local profile to Firestore
            try {
              const currentUser = getCurrentFirebaseUser();
              if (currentUser && currentUser.email === user.email) {
                await createFirebaseProfile(localProfile);
                logger.info('Profile synced to Firestore successfully', { email: user.email });
                // Profile was synced, now try to get it again
                profile = await hybridGetProfile(user.email);
                // If Firestore read still returns null, fall back to local profile so user can continue
                if (!profile) {
                  profile = localProfile;
                }
              } else {
                logger.warn('User not authenticated in Firebase, cannot sync profile', {
                  email: user.email,
                  hasCurrentUser: !!currentUser,
                  currentUserEmail: currentUser?.email
                });
                // Use local profile
                profile = localProfile;
              }
            } catch (syncError) {
              logger.warn('Failed to sync profile to Firestore, using local profile', {
                email: user.email,
                error: syncError instanceof Error ? syncError.message : String(syncError)
              });
              profile = localProfile;
            }
          }
        }
      }
      
      if (profile) {
        if (profile.suspended) {
          Alert.alert(
            'Account suspended',
            'Your account is suspended. Do you want to unsuspend and sign in?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: async () => {
                  await clearAllUserData();
                  setLoading(false);
                },
              },
              {
                text: 'Unsuspend & Sign in',
                onPress: async () => {
                  try {
                    await unsuspendAccount(user.email);
                    const unsuspendedProfile = { ...profile, suspended: false };
                    try {
                      await AsyncStorage.setItem('profile', JSON.stringify(unsuspendedProfile));
                      const allProfilesData = await AsyncStorage.getItem('allProfiles');
                      let allProfiles: Profile[] = allProfilesData ? JSON.parse(allProfilesData) : [];
                      const existingIndex = allProfiles.findIndex((p) => p.email === unsuspendedProfile.email);
                      if (existingIndex === -1) {
                        allProfiles.push(unsuspendedProfile);
                        await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
                      }
                      router.replace('/(tabs)/home');
                    } catch (profileStorageError) {
                      logger.warn('Failed to save profile after unsuspend', {
                        error: profileStorageError instanceof Error ? profileStorageError.message : String(profileStorageError),
                        email: user.email
                      });
                      router.replace('/(tabs)/home');
                    }
                  } catch (unsuspendError) {
                    ErrorHandler.handleError(unsuspendError, 'Failed to unsuspend account');
                  } finally {
                    setLoading(false);
                  }
                },
              },
            ]
          );
          setLoading(false);
          return;
        }
        // Save profile locally if retrieved from Firebase
        try {
          await AsyncStorage.setItem('profile', JSON.stringify(profile));
          
          // Also add to allProfiles if not already there
          const allProfilesData = await AsyncStorage.getItem('allProfiles');
          let allProfiles: Profile[] = allProfilesData ? JSON.parse(allProfilesData) : [];
          const existingIndex = allProfiles.findIndex((p) => p.email === profile.email);
          if (existingIndex === -1) {
            allProfiles.push(profile);
            await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
            logger.info('Profile added to allProfiles after login', { email: user.email });
          }
          
          logger.info('Profile loaded and saved locally after login', { email: user.email });
        } catch (profileStorageError) {
          logger.warn('Failed to save profile locally, continuing anyway', {
            error: profileStorageError instanceof Error ? profileStorageError.message : String(profileStorageError),
            email: user.email
          });
          // Don't throw - user can continue
        }
        
        try {
          router.replace('/(tabs)/home');
        } catch (navError) {
          logger.error('Failed to navigate to home', {
            error: navError instanceof Error ? navError.message : String(navError),
            email: user.email
          });
          throw new Error(`Failed to navigate: ${navError instanceof Error ? navError.message : String(navError)}`);
        }
      } else {
        logger.info('No profile found, redirecting to profile creation', { email: user.email });
        try {
          router.replace('/profile/create');
        } catch (navError) {
          logger.error('Failed to navigate to profile creation', {
            error: navError instanceof Error ? navError.message : String(navError),
            email: user.email
          });
          throw new Error(`Failed to navigate: ${navError instanceof Error ? navError.message : String(navError)}`);
        }
      }
    } catch (error) {
      // Handle authentication failure
      const sanitizedEmail = sanitizeEmail(email);
      
      // Log detailed error information for debugging (always extract a string so logs never show undefined)
      let errorMessage: string;
      if (error === null || error === undefined) {
        errorMessage = 'Error object is null or undefined';
        logger.error('Login failed with null/undefined error', {
          email: sanitizedEmail,
          errorType: typeof error,
          errorValue: String(error),
        });
      } else if (typeof error === 'object' && (error as any).message != null) {
        errorMessage = String((error as any).message);
      } else if (typeof error === 'object' && (error as any).code != null) {
        errorMessage = String((error as any).code);
      } else {
        errorMessage = String(error);
      }
      
      const firebaseErrorCode = (error as any)?.firebaseErrorCode;
      const firebaseError = (error as any)?.firebaseError;
      
      logger.error('Login failed', {
        email: sanitizedEmail,
        error: errorMessage,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        firebaseErrorCode: firebaseErrorCode ?? undefined,
        firebaseError: firebaseError != null ? String(firebaseError) : undefined,
      });
      
      // Increment rate limit on failed attempt
      await isRateLimited(sanitizedEmail);
      const remainingAttempts = await getRemainingAttempts(sanitizedEmail);
      
      // Create user-friendly error message
      let userMessage = ERROR_MESSAGES.INVALID_PASSWORD;
      
      // Check if error message contains specific information
      if (errorMessage.includes('User not found') || errorMessage.includes('does not exist')) {
        userMessage = 'Email not found. Please sign up first or check your email address.';
      } else if (errorMessage.includes('password') && (errorMessage.includes('incorrect') || errorMessage.includes('wrong'))) {
        userMessage = 'Incorrect password. Please check your password and try again.';
      }
      
      // Add Firebase-specific error context if available
      if (firebaseErrorCode) {
        if (firebaseErrorCode === 'auth/user-not-found') {
          userMessage = 'Email not found. Please sign up first or check your email address.';
        } else if (firebaseErrorCode === 'auth/wrong-password') {
          userMessage = 'Incorrect password. Please check your password and try again.';
        } else if (firebaseErrorCode === 'auth/invalid-credential') {
          // Invalid credential could mean user not found OR wrong password
          // Check error message for more context
          if (errorMessage.includes('User not found') || errorMessage.includes('does not exist')) {
            userMessage = 'Email not found. Please sign up first or check your email address.';
          } else {
            userMessage = 'Invalid email or password. Please check your credentials.';
          }
        } else if (firebaseErrorCode === 'auth/network-request-failed') {
          userMessage = 'Network error. Please check your internet connection and try again.';
        } else if (firebaseErrorCode === 'auth/too-many-requests') {
          userMessage = 'Too many login attempts. Please try again later.';
        } else {
          userMessage = `Login failed: ${errorMessage}`;
        }
      }
      
      if (remainingAttempts > 0) {
        ErrorHandler.handleError(
          error, 
          `${userMessage}\n${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
          { email }
        );
      } else {
        ErrorHandler.handleError(error, 'Too many failed attempts. Please try again later.', { email });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="auto" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email input"
              accessibilityHint="Enter your email address to log in"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Password input"
              accessibilityHint="Enter your password to log in"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Log in button"
            accessibilityHint="Tap to log in with your email and password"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/signup')}
            accessibilityLabel="Sign up link"
            accessibilityHint="Tap to navigate to sign up page"
          >
            <Text style={styles.linkText}>
              Don't have an account? Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 16,
  },
});
