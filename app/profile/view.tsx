import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/utils/logger';
import { safeParseJSON, validateProfileSchema } from '@/utils/schemaValidation';
import { areUsersMatched } from '@/utils/connectionUtils';

interface Profile {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
  location?: string;
}

/**
 * View Profile Screen Component
 * 
 * Displays a user's profile (can be current user or another user) with:
 * - Profile information display
 * - Request mentorship button (if viewing another user)
 * - Navigation to edit (if viewing own profile)
 * - Optimized loading to prevent re-renders
 * 
 * @component
 * @returns {JSX.Element} Profile view screen
 */
export default function ViewProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMatched, setIsMatched] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const isLoadingRef = useRef(false);
  const lastParamsRef = useRef<string>('');

  // Memoize the actual string values to prevent unnecessary re-renders
  const emailValue = useMemo(() => {
    return params.email ? String(params.email) : '';
  }, [params.email]);

  const profileValue = useMemo(() => {
    return params.profile ? String(params.profile) : '';
  }, [params.profile]);

  useEffect(() => {
    // Create a stable key from memoized values
    const currentKey = `${emailValue}|${profileValue}`;

    // Check if params actually changed
    if (currentKey === lastParamsRef.current && lastParamsRef.current !== '') {
      return; // Same params, skip
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) return;

    // Update ref immediately
    lastParamsRef.current = currentKey;
    isLoadingRef.current = true;

    const loadProfile = async () => {
      try {
        // If profile is passed directly
        if (profileValue) {
          const parsed = safeParseJSON(
            profileValue,
            validateProfileSchema,
            null
          );
          if (parsed) {
            setProfile(parsed);
            
            // Check if it's own profile or if users are matched
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
              const user = safeParseJSON<{ email: string }>(
                userData,
                (data): data is { email: string } => typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
                null
              );
              if (user) {
                setIsOwnProfile(user.email === parsed.email);
                if (user.email !== parsed.email) {
                  const matched = await areUsersMatched(user.email, parsed.email);
                  setIsMatched(matched);
                } else {
                  setIsMatched(true); // Own profile is always "matched"
                }
              }
            }
            
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }
        }

        // If email is passed, load from storage
        if (emailValue) {
          const email = emailValue;
          
          // Try to get from allProfiles
          const allProfilesData = await AsyncStorage.getItem('allProfiles');
          if (allProfilesData) {
            const allProfiles = safeParseJSON<Profile[]>(
              allProfilesData,
              (data): data is Profile[] => {
                if (!Array.isArray(data)) return false;
                return data.every(p => validateProfileSchema(p));
              },
              []
            ) || [];
            const foundProfile = allProfiles.find((p) => p.email === email);
            if (foundProfile) {
              setProfile(foundProfile);
              
              // Check if it's own profile or if users are matched
              const userData = await AsyncStorage.getItem('user');
              if (userData) {
                const user = safeParseJSON<{ email: string }>(
                  userData,
                  (data): data is { email: string } => typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
                  null
                );
                if (user) {
                  setIsOwnProfile(user.email === foundProfile.email);
                  if (user.email !== foundProfile.email) {
                    const matched = await areUsersMatched(user.email, foundProfile.email);
                    setIsMatched(matched);
                  } else {
                    setIsMatched(true); // Own profile is always "matched"
                  }
                }
              }
              
              setLoading(false);
              isLoadingRef.current = false;
              return;
            }
          }

          // Try to get from test profiles
          const testProfileKey = `testProfile_${email}`;
          const testProfileData = await AsyncStorage.getItem(testProfileKey);
          if (testProfileData) {
            const testProfile = safeParseJSON(
              testProfileData,
              validateProfileSchema,
              null
            );
            if (testProfile) {
              setProfile(testProfile);
              
              // Check if it's own profile or if users are matched
              const userData = await AsyncStorage.getItem('user');
              if (userData) {
                const user = safeParseJSON<{ email: string }>(
                  userData,
                  (data): data is { email: string } => typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
                  null
                );
                if (user) {
                  setIsOwnProfile(user.email === testProfile.email);
                  if (user.email !== testProfile.email) {
                    const matched = await areUsersMatched(user.email, testProfile.email);
                    setIsMatched(matched);
                  } else {
                    setIsMatched(true); // Own profile is always "matched"
                  }
                }
              }
              
              setLoading(false);
              isLoadingRef.current = false;
              return;
            }
          }
        }

        // If we get here and haven't loaded anything, set loading to false
              setProfile(null);
              setLoading(false);
            } catch (error) {
              logger.error('Error loading profile', error instanceof Error ? error : new Error(String(error)));
              setProfile(null);
              setLoading(false);
            } finally {
        isLoadingRef.current = false;
      }
    };

    loadProfile();
  }, [emailValue, profileValue]); // Depend on memoized stable values

  const handleEmail = () => {
    if (profile?.email) {
      Linking.openURL(`mailto:${profile.email}`);
    }
  };

  const handlePhone = () => {
    if (profile?.phoneNumber) {
      Linking.openURL(`tel:${profile.phoneNumber}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyStateText}>Profile not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back button"
            accessibilityHint="Tap to go back to previous screen"
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Back button"
            accessibilityHint="Tap to go back to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {(isOwnProfile || isMatched) ? (
            <>
              <TouchableOpacity 
                style={styles.infoCard} 
                onPress={handleEmail}
                accessibilityLabel={`Email ${profile.email}`}
                accessibilityHint="Tap to open email app to send email"
              >
                <View style={styles.infoRow}>
                  <Ionicons name="mail" size={24} color="#2563eb" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.infoCard} 
                onPress={handlePhone}
                accessibilityLabel={`Phone ${profile.phoneNumber}`}
                accessibilityHint="Tap to open phone app to call"
              >
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={24} color="#2563eb" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{profile.phoneNumber}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="lock-closed" size={24} color="#94a3b8" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Contact Information</Text>
                  <Text style={styles.infoValue}>Connect to view contact details</Text>
                </View>
              </View>
            </View>
          )}

          {profile.location && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={24} color="#10b981" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{profile.location}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentoring</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="star" size={24} color="#f59e0b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Expertise</Text>
                <Text style={styles.infoValue}>{profile.expertise}</Text>
                <Text style={styles.infoSubtext}>
                  {profile.expertiseYears} {profile.expertiseYears === 1 ? 'year' : 'years'} of experience
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="book" size={24} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Interest</Text>
                <Text style={styles.infoValue}>{profile.interest}</Text>
                <Text style={styles.infoSubtext}>
                  {profile.interestYears} {profile.interestYears === 1 ? 'year' : 'years'} of experience
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => router.push({
            pathname: '/request/send',
            params: { profile: JSON.stringify(profile) },
          })}
          accessibilityLabel="Request as mentor button"
          accessibilityHint={`Tap to send a mentorship request to ${profile.name}`}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.requestButtonText}>Request as Mentor</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
});
