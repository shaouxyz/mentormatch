import { useState, useEffect, useRef } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MAX_NOTE_LENGTH } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { validateMentorshipRequestSchema } from '@/utils/schemaValidation';
import { sanitizeString } from '@/utils/security';
import { safeParseJSON } from '@/utils/schemaValidation';

interface Profile {
  name: string;
  email: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  phoneNumber: string;
}

interface User {
  email: string;
  password?: string;
  id: string;
  createdAt?: string;
  isTestAccount?: boolean;
}

interface CurrentUser extends User, Profile {}

interface MentorshipRequest {
  id: string;
  requesterEmail: string;
  requesterName: string;
  mentorEmail: string;
  mentorName: string;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  responseNote?: string;
  createdAt: string;
  respondedAt?: string;
}

/**
 * Send Request Screen Component
 * 
 * Allows users to send mentorship requests with:
 * - Optional note field with character limit
 * - Real-time character counter
 * - Input sanitization
 * - Schema validation
 * - Duplicate request prevention
 * 
 * @component
 * @returns {JSX.Element} Request sending form
 */
export default function SendRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastProfileParamRef = useRef<string | null>(null);
  const lastCurrentUserKeyRef = useRef<string | null>(null);

  // Extract stable value from params
  const profileParam = params.profile ? String(params.profile) : undefined;

  useEffect(() => {
    // Load profile from params (only when it changes)
    if (profileParam && profileParam !== lastProfileParamRef.current) {
      lastProfileParamRef.current = profileParam;
      try {
        const parsed = JSON.parse(profileParam) as Profile;
        setProfile((prev) => {
          if (
            prev &&
            prev.email === parsed.email &&
            prev.name === parsed.name &&
            prev.expertise === parsed.expertise &&
            prev.interest === parsed.interest &&
            prev.expertiseYears === parsed.expertiseYears &&
            prev.interestYears === parsed.interestYears &&
            prev.phoneNumber === parsed.phoneNumber
          ) {
            return prev; // no-op to avoid unnecessary re-renders
          }
          return parsed;
        });
      } catch (error) {
        logger.error('Error parsing profile', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [profileParam]); // Only depend on the actual profile string

  useEffect(() => {
    // Load current user only once on mount - no dependencies to prevent re-runs
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadCurrentUser = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        const userData = await AsyncStorage.getItem('user');
        const profileData = await AsyncStorage.getItem('profile');
        if (userData && profileData) {
          const user: User = JSON.parse(userData);
          const profile: Profile = JSON.parse(profileData);
          const nextUser: CurrentUser = { ...user, ...profile };
          const key = `${nextUser.email}|${nextUser.id}|${nextUser.name}|${nextUser.phoneNumber}`;
          if (lastCurrentUserKeyRef.current !== key) {
            lastCurrentUserKeyRef.current = key;
            setCurrentUser((prev) => {
              if (
                prev &&
                prev.email === nextUser.email &&
                prev.id === nextUser.id &&
                prev.name === nextUser.name &&
                prev.phoneNumber === nextUser.phoneNumber
              ) {
                return prev; // no-op to avoid render loops if this effect re-fires unexpectedly
              }
              return nextUser;
            });
          }
        }
      } catch (error) {
        logger.error('Error loading current user', error instanceof Error ? error : new Error(String(error)));
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadCurrentUser();
  }, []); // Empty array - only run once on mount

  const handleSendRequest = async () => {
    if (!profile || !currentUser) {
      Alert.alert('Error', 'Unable to send request. Please try again.');
      return;
    }

    // Check if request already exists
    try {
      const existingRequests = await AsyncStorage.getItem('mentorshipRequests');
      if (existingRequests) {
        const requests: MentorshipRequest[] = JSON.parse(existingRequests);
        const existing = requests.find(
          (r) =>
            r.requesterEmail === currentUser.email &&
            r.mentorEmail === profile.email &&
            r.status === 'pending'
        );
        if (existing) {
          Alert.alert('Request Already Sent', 'You have already sent a request to this person.');
          return;
          }
        }
      } catch (error) {
        logger.warn('Error checking existing requests', { error: error instanceof Error ? error.message : String(error) });
      }

    setLoading(true);

    try {
      const request: MentorshipRequest = {
        id: Date.now().toString(),
        requesterEmail: currentUser.email,
        requesterName: currentUser.name,
        mentorEmail: profile.email,
        mentorName: profile.name,
        note: sanitizeString(note.trim()),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const existingRequests = await AsyncStorage.getItem('mentorshipRequests');
      const requests: MentorshipRequest[] = existingRequests
        ? safeParseJSON<MentorshipRequest[]>(
            existingRequests,
            (data): data is MentorshipRequest[] => {
              if (!Array.isArray(data)) return false;
              return data.every(req => validateMentorshipRequestSchema(req));
            },
            []
          ) || []
        : [];

            // Validate before storing
            if (!validateMentorshipRequestSchema(request)) {
              ErrorHandler.handleError(new Error('Invalid request data'), 'Request data validation failed');
              return;
            }

            requests.push(request);
            await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

            Alert.alert('Request Sent', 'Your mentorship request has been sent successfully!', [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]);
          } catch (error) {
            ErrorHandler.handleStorageError(error, 'send request');
          } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Back button"
            accessibilityHint="Tap to go back to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>Request Mentor</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileExpertise}>{profile.expertise}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            Message (Optional)
          </Text>
          <Text style={styles.hint}>
            Add a personal note to introduce yourself and explain why you'd like them as a mentor.
          </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Hi! I'm interested in learning from you because..."
                  placeholderTextColor="#94a3b8"
                  value={note}
                  onChangeText={(text) => {
                    const sanitized = sanitizeString(text);
                    if (sanitized.length <= MAX_NOTE_LENGTH) {
                      setNote(sanitized);
                    }
                  }}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={MAX_NOTE_LENGTH}
                  accessibilityLabel="Request message input"
                  accessibilityHint="Enter an optional message to include with your mentorship request"
                />
                {note.length > 0 && (
                  <Text style={styles.charCount}>
                    {note.length}/{MAX_NOTE_LENGTH} characters
                  </Text>
                )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendRequest}
            disabled={loading}
            accessibilityLabel="Send request button"
            accessibilityHint="Tap to send the mentorship request"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Request'}
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
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileExpertise: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 120,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: -20,
    marginBottom: 8,
  },
});
