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
      
      // Reset rate limit on successful login
      await resetRateLimit(sanitizedEmail);
      
      // Set current user session
      await setCurrentUser(user.email);
      
      // Start session
      await startSession();
      
      // Store user data for backward compatibility (without password)
      await AsyncStorage.setItem('user', JSON.stringify({
        email: user.email,
        id: user.id,
        createdAt: user.createdAt,
      }));
      
      // Check if profile exists
      const profile = await AsyncStorage.getItem('profile');
      if (profile) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/profile/create');
      }
    } catch (error) {
      // Handle authentication failure
      const sanitizedEmail = sanitizeEmail(email);
      
      // Increment rate limit on failed attempt
      await isRateLimited(sanitizedEmail);
      const remainingAttempts = await getRemainingAttempts(sanitizedEmail);
      
      if (remainingAttempts > 0) {
        ErrorHandler.handleError(
          error, 
          `${ERROR_MESSAGES.INVALID_PASSWORD}\n${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
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
