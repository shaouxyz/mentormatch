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
import { validateProfileSchema } from '@/utils/schemaValidation';
import { logger } from '@/utils/logger';
import { sanitizeTextField, sanitizeEmail, sanitizePhoneNumber } from '@/utils/security';
import { ProfileFormFields } from '@/components/ProfileFormFields';

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
 * Create Profile Screen Component
 * 
 * Allows new users to create their profile with:
 * - All required profile fields
 * - Input validation and sanitization
 * - Character limits and constraints
 * - Profile synchronization with allProfiles
 * - Schema validation before storage
 * 
 * @component
 * @returns {JSX.Element} Profile creation form
 */
export default function CreateProfileScreen() {
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
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setProfile(prev => ({ ...prev, email: user.email }));
      }
    } catch (error) {
      logger.error('Error loading user email', error instanceof Error ? error : new Error(String(error)));
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('profile', JSON.stringify(profileData));
      
      // Add profile to allProfiles array so it's visible in discover
      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      let allProfiles: typeof profileData[] = allProfilesData ? JSON.parse(allProfilesData) : [];
      
      // Remove existing profile with same email if it exists (update case)
      allProfiles = allProfiles.filter((p) => p.email !== profileData.email);
      
      // Add new/updated profile
      allProfiles.push(profileData);
      
      // Validate before storing
      if (!validateProfileSchema(profileData)) {
        ErrorHandler.handleError(new Error('Invalid profile data'), 'Profile data validation failed');
        return;
      }

      await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
      
      Alert.alert('Success', SUCCESS_MESSAGES.PROFILE_CREATED, [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'save profile');
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
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>
        </View>

        <View style={styles.form}>
          <ProfileFormFields profile={profile} onProfileChange={setProfile} />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            accessibilityLabel="Save profile button"
            accessibilityHint="Tap to save your profile"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Save Profile'}
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
