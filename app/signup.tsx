import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { validateEmail, validatePassword } from '@/utils/validation';
import { ERROR_MESSAGES } from '@/utils/constants';
import { ErrorHandler } from '@/utils/errorHandler';
import { createUser, setCurrentUser } from '@/utils/userManagement';
import { sanitizeEmail } from '@/utils/security';
import { startSession } from '@/utils/sessionManager';
import { hybridSignUp } from '@/services/hybridAuthService';

/**
 * Signup Screen Component
 * 
 * Handles new user registration with:
 * - Email and password validation
 * - Password confirmation matching
 * - Secure password hashing
 * - Multi-user account creation
 * - Session initialization
 * 
 * @component
 * @returns {JSX.Element} Signup form with email, password, and confirm password inputs
 */
export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', ERROR_MESSAGES.FILL_ALL_FIELDS);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password, confirmPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', passwordValidation.error || ERROR_MESSAGES.PASSWORD_TOO_SHORT);
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert('Error', emailValidation.error || ERROR_MESSAGES.INVALID_EMAIL);
      return;
    }

    setLoading(true);

    try {
      // Sanitize email input
      const sanitizedEmail = sanitizeEmail(email);
      
      // Create user with hybrid service (local + Firebase if configured)
      const user = await hybridSignUp(sanitizedEmail, password);
      
      // Set current user session
      await setCurrentUser(user.email);
      
      // Start session
      await startSession();
      
      // Store user data in AsyncStorage for backward compatibility (without password)
      await AsyncStorage.setItem('user', JSON.stringify({
        email: user.email,
        id: user.id,
        createdAt: user.createdAt,
      }));

      // Navigate to profile creation
      router.replace('/profile/create');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      ErrorHandler.handleError(error, errorMessage.includes('already exists') ? errorMessage : 'Failed to create account. Please try again.', { email });
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start matching</Text>
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
              accessibilityHint="Enter your email address to create an account"
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
              accessibilityHint="Enter your password, must be at least 6 characters"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Confirm password input"
              accessibilityHint="Re-enter your password to confirm"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            accessibilityLabel="Sign up button"
            accessibilityHint="Tap to create your account"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/login')}
            accessibilityLabel="Log in link"
            accessibilityHint="Tap to navigate to log in page"
          >
            <Text style={styles.linkText}>
              Already have an account? Log In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 60,
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
