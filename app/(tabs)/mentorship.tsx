import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/utils/logger';
import { safeParseJSON, validateProfileSchema, validateMentorshipRequestSchema } from '@/utils/schemaValidation';

interface Profile {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
}

interface MentorshipConnection {
  name: string;
  email: string;
  expertise?: string;
  interest?: string;
  note?: string;
  responseNote?: string;
  connectedAt: string;
}

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

export default function MentorshipScreen() {
  const router = useRouter();
  const [mentors, setMentors] = useState<MentorshipConnection[]>([]);
  const [mentees, setMentees] = useState<MentorshipConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConnections();
    }, [])
  );

  const loadConnections = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setMentors([]);
        setMentees([]);
        setLoading(false);
        return;
      }

      const user = safeParseJSON<{ email: string }>(
        userData,
        (data): data is { email: string } => typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
        null
      );
      
      if (!user) {
        setMentors([]);
        setMentees([]);
        setLoading(false);
        return;
      }
      
      const userEmail = user.email;

      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      if (!requestsData) {
        setMentors([]);
        setMentees([]);
        setLoading(false);
        return;
      }

      const allRequests = safeParseJSON<MentorshipRequest[]>(
        requestsData,
        (data): data is MentorshipRequest[] => {
          if (!Array.isArray(data)) return false;
          return data.every(req => validateMentorshipRequestSchema(req));
        },
        []
      ) || [];
      const acceptedRequests = allRequests.filter((r) => r.status === 'accepted');

      // Mentors: People who accepted requests from the current user
      // (current user is requester, mentor accepted)
      const mentorRequests = acceptedRequests.filter(
        (r) => r.requesterEmail === userEmail
      );

      // Mentees: People whose requests the current user accepted
      // (current user is mentor, requester is mentee)
      const menteeRequests = acceptedRequests.filter(
        (r) => r.mentorEmail === userEmail
      );

      // Get profile information for mentors and mentees
      const mentorsList: MentorshipConnection[] = await Promise.all(
        mentorRequests.map(async (req) => {
          // Try to get mentor's profile
          const allProfilesData = await AsyncStorage.getItem('allProfiles');
          let mentorProfile: Profile | null = null;
          
          if (allProfilesData) {
            const allProfiles = safeParseJSON<Profile[]>(
              allProfilesData,
              (data): data is Profile[] => {
                if (!Array.isArray(data)) return false;
                return data.every(p => validateProfileSchema(p));
              },
              []
            ) || [];
            mentorProfile = allProfiles.find((p) => p.email === req.mentorEmail) || null;
          }

          // Check test profiles
          if (!mentorProfile) {
            const testProfileKey = `testProfile_${req.mentorEmail}`;
            const testProfileData = await AsyncStorage.getItem(testProfileKey);
            if (testProfileData) {
              mentorProfile = safeParseJSON(
                testProfileData,
                validateProfileSchema,
                null
              );
            }
          }

          return {
            name: req.mentorName,
            email: req.mentorEmail,
            expertise: mentorProfile?.expertise,
            interest: mentorProfile?.interest,
            note: req.note,
            responseNote: req.responseNote,
            connectedAt: req.respondedAt || req.createdAt,
          };
        })
      );

      const menteesList: MentorshipConnection[] = await Promise.all(
        menteeRequests.map(async (req) => {
          // Try to get mentee's profile
          const allProfilesData = await AsyncStorage.getItem('allProfiles');
          let menteeProfile: Profile | null = null;
          
          if (allProfilesData) {
            const allProfiles = safeParseJSON<Profile[]>(
              allProfilesData,
              (data): data is Profile[] => {
                if (!Array.isArray(data)) return false;
                return data.every(p => validateProfileSchema(p));
              },
              []
            ) || [];
            menteeProfile = allProfiles.find((p) => p.email === req.requesterEmail) || null;
          }

          // Check test profiles
          if (!menteeProfile) {
            const testProfileKey = `testProfile_${req.requesterEmail}`;
            const testProfileData = await AsyncStorage.getItem(testProfileKey);
            if (testProfileData) {
              menteeProfile = safeParseJSON(
                testProfileData,
                validateProfileSchema,
                null
              );
            }
          }

          return {
            name: req.requesterName,
            email: req.requesterEmail,
            expertise: menteeProfile?.expertise,
            interest: menteeProfile?.interest,
            note: req.note,
            responseNote: req.responseNote,
            connectedAt: req.respondedAt || req.createdAt,
          };
        })
      );

      setMentors(mentorsList);
      setMentees(menteesList);
    } catch (error) {
      logger.error('Error loading connections', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
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

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Mentors</Text>
          {mentors.length === 0 ? (
            <View style={styles.emptyConnectionCard}>
              <Ionicons name="people-outline" size={24} color="#cbd5e1" />
              <Text style={styles.emptyConnectionText}>No mentors yet</Text>
              <Text style={styles.emptyConnectionSubtext}>
                Send mentorship requests to connect with mentors
              </Text>
            </View>
          ) : (
            mentors.map((mentor, index) => (
              <TouchableOpacity
                key={index}
                style={styles.connectionCard}
                onPress={() => {
                  router.push({
                    pathname: '/profile/view',
                    params: { email: mentor.email },
                  });
                }}
                accessibilityLabel={`Mentor ${mentor.name}`}
                accessibilityHint={`Tap to view ${mentor.name}'s profile. Expertise: ${mentor.expertise}`}
              >
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionAvatar}>
                    <Text style={styles.connectionAvatarText}>
                      {mentor.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{mentor.name}</Text>
                    {mentor.expertise && (
                      <Text style={styles.connectionDetail}>
                        <Ionicons name="star" size={14} color="#f59e0b" /> {mentor.expertise}
                      </Text>
                    )}
                    {mentor.responseNote && (
                      <Text style={styles.connectionNote} numberOfLines={2}>
                        "{mentor.responseNote}"
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Mentees</Text>
          {mentees.length === 0 ? (
            <View style={styles.emptyConnectionCard}>
              <Ionicons name="people-outline" size={24} color="#cbd5e1" />
              <Text style={styles.emptyConnectionText}>No mentees yet</Text>
              <Text style={styles.emptyConnectionSubtext}>
                Accept mentorship requests to connect with mentees
              </Text>
            </View>
          ) : (
            mentees.map((mentee, index) => (
              <TouchableOpacity
                key={index}
                style={styles.connectionCard}
                onPress={() => {
                  router.push({
                    pathname: '/profile/view',
                    params: { email: mentee.email },
                  });
                }}
                accessibilityLabel={`Mentee ${mentee.name}`}
                accessibilityHint={`Tap to view ${mentee.name}'s profile. Learning: ${mentee.interest}`}
              >
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionAvatar}>
                    <Text style={styles.connectionAvatarText}>
                      {mentee.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{mentee.name}</Text>
                    {mentee.interest && (
                      <Text style={styles.connectionDetail}>
                        <Ionicons name="book" size={14} color="#3b82f6" /> Learning: {mentee.interest}
                      </Text>
                    )}
                    {mentee.note && (
                      <Text style={styles.connectionNote} numberOfLines={2}>
                        "{mentee.note}"
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  connectionCard: {
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
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  connectionDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  connectionNote: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyConnectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyConnectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyConnectionSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
});
