import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MAX_NOTE_LENGTH } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { sanitizeString } from '@/utils/security';
import { safeParseJSON, validateMentorshipRequestSchema } from '@/utils/schemaValidation';

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
 * Respond Request Screen Component
 * 
 * Allows mentors to accept or decline mentorship requests with:
 * - Optional response note field
 * - Real-time character counter
 * - Input sanitization
 * - Request status update
 * - Schema validation
 * 
 * @component
 * @returns {JSX.Element} Request response form
 */
export default function RespondRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [request, setRequest] = useState<MentorshipRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [loading, setLoading] = useState(false);
  const lastRequestParamRef = useRef<string | null>(null);

  // Extract stable value from params
  const requestParam = params.request ? String(params.request) : undefined;

  useEffect(() => {
    // Only load if requestParam changed
    if (requestParam && requestParam !== lastRequestParamRef.current) {
      lastRequestParamRef.current = requestParam;
      try {
        const parsed = safeParseJSON<MentorshipRequest>(
          requestParam,
          (data): data is MentorshipRequest => validateMentorshipRequestSchema(data),
          null
        );

        if (!parsed) {
          ErrorHandler.handleError(new Error('Invalid request data'), 'Failed to load request.');
          return;
        }

        setRequest((prev) => {
          if (
            prev &&
            prev.id === parsed.id &&
            prev.status === parsed.status &&
            prev.responseNote === parsed.responseNote &&
            prev.respondedAt === parsed.respondedAt &&
            prev.note === parsed.note
          ) {
            return prev;
          }
          return parsed;
        });
      } catch (error) {
        logger.error('Error parsing request', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [requestParam]); // Only depend on the actual request string

  const handleRespond = async (status: 'accepted' | 'declined') => {
    if (!request) return;

    setLoading(true);

    try {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = requestsData
        ? safeParseJSON<MentorshipRequest[]>(
            requestsData,
            (data): data is MentorshipRequest[] => {
              if (!Array.isArray(data)) return false;
              return data.every((req) => validateMentorshipRequestSchema(req));
            },
            []
          ) || []
        : [];

      const requestIndex = requests.findIndex((r) => r.id === request.id);
      if (requestIndex === -1) {
        ErrorHandler.handleError(new Error('Request not found'), 'Request no longer exists.');
        return;
      }

      requests[requestIndex] = {
        ...requests[requestIndex],
        status,
        responseNote: sanitizeString(responseNote.trim()),
        respondedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));
      router.back();
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'respond to request');
    } finally {
      setLoading(false);
    }
  };

  if (!request) {
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
          <Text style={styles.title}>Respond to Request</Text>
        </View>

        <View style={styles.requestCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {request.requesterName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.requestName}>{request.requesterName}</Text>
          <Text style={styles.requestEmail}>{request.requesterEmail}</Text>

          {request.note && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Message:</Text>
              <Text style={styles.noteText}>{request.note}</Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            Response Note (Optional)
          </Text>
          <Text style={styles.hint}>
            Add a personal note to your response.
          </Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Thank you for your interest..."
                    placeholderTextColor="#94a3b8"
                    value={responseNote}
                    onChangeText={(text) => {
                      const sanitized = sanitizeString(text);
                      if (sanitized.length <= MAX_NOTE_LENGTH) {
                        setResponseNote(sanitized);
                      }
                    }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={MAX_NOTE_LENGTH}
                    accessibilityLabel="Response note input"
                    accessibilityHint="Enter an optional message to include with your response"
                  />
                  {responseNote.length > 0 && (
                    <Text style={styles.charCount}>
                      {responseNote.length}/{MAX_NOTE_LENGTH} characters
                    </Text>
                  )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton, loading && styles.buttonDisabled]}
              onPress={() => handleRespond('accepted')}
              disabled={loading}
              accessibilityLabel="Accept request button"
              accessibilityHint="Tap to accept this mentorship request"
              accessibilityState={{ disabled: loading }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.declineButton, loading && styles.buttonDisabled]}
              onPress={() => handleRespond('declined')}
              disabled={loading}
              accessibilityLabel="Decline request button"
              accessibilityHint="Tap to decline this mentorship request"
              accessibilityState={{ disabled: loading }}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
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
  requestCard: {
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
  requestName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  noteContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
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
    minHeight: 100,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
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
