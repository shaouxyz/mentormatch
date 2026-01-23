import { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { validateProfile } from '@/utils/validation';
import { SUCCESS_MESSAGES } from '@/utils/constants';
import { ErrorHandler } from '@/utils/errorHandler';
import { validateProfileSchema, safeParseJSON } from '@/utils/schemaValidation';
import { logger } from '@/utils/logger';
import { sanitizeTextField, sanitizeEmail, sanitizePhoneNumber } from '@/utils/security';
import { ProfileFormFields } from '@/components/ProfileFormFields';
import { hybridUpdateProfile } from '@/services/hybridProfileService';

interface ProfileData {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: string;
  interestYears: string;
  email: string;
  phoneNumber: string;
  location: string;
}

/**
 * Edit Profile Screen Component
 * 
 * Allows users to update their existing profile with:
 * - Pre-populated form fields
 * - Input validation and sanitization
 * - Profile synchronization with allProfiles
 * - Schema validation before storage
 * 
 * @component
 * @returns {JSX.Element} Profile edit form
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    expertise: '',
    interest: '',
    expertiseYears: '',
    interestYears: '',
    email: '',
    phoneNumber: '',
    location: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('profile');
      if (profileData) {
        const parsed = safeParseJSON(
          profileData,
          validateProfileSchema,
          null
        );
        if (parsed) {
          setProfile({
            name: parsed.name || '',
            expertise: parsed.expertise || '',
            interest: parsed.interest || '',
            expertiseYears: parsed.expertiseYears?.toString() || '',
            interestYears: parsed.interestYears?.toString() || '',
            email: parsed.email || '',
            phoneNumber: parsed.phoneNumber || '',
            location: parsed.location || '',
          });
        }
      }
    } catch (error) {
      logger.error('Error loading profile', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleSave = async () => {
    // Validation using shared validation utility
    const validation = validateProfile(profile);
    if (!validation.isValid) {
      Alert.alert('Error', validation.error || 'Please check your input');
      return;
    }

    setLoading(true);

    try {
      // Sanitize all profile data before storing
      const profileData = {
        name: sanitizeTextField(profile.name),
        expertise: sanitizeTextField(profile.expertise),
        interest: sanitizeTextField(profile.interest),
        expertiseYears: Number(profile.expertiseYears),
        interestYears: Number(profile.interestYears),
        email: sanitizeEmail(profile.email),
        phoneNumber: sanitizePhoneNumber(profile.phoneNumber),
        location: profile.location ? sanitizeTextField(profile.location) : undefined,
        updatedAt: new Date().toISOString(),
      };

      // Validate before storing
      if (!validateProfileSchema(profileData)) {
        ErrorHandler.handleError(new Error('Invalid profile data'), 'Profile data validation failed');
        return;
      }

      // Use hybrid service to update profile (local + Firebase if configured)
      await hybridUpdateProfile(profileData.email, profileData);
      
      Alert.alert('Success', SUCCESS_MESSAGES.PROFILE_UPDATED, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'update profile');
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
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your information</Text>
        </View>

        <View style={styles.form}>
          <ProfileFormFields profile={profile} onProfileChange={setProfile} />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            accessibilityLabel="Save changes button"
            accessibilityHint="Tap to save your profile changes"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Save Changes'}
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
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
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
});
