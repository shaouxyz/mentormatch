import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/utils/logger';
import { safeParseJSON } from '@/utils/schemaValidation';
import { hybridGetUserMeetings, hybridUpdateMeeting } from '@/services/hybridMeetingService';
import { scheduleMeetingNotifications, cancelMeetingNotifications } from '@/services/meetingNotificationService';
import { Meeting } from '@/types/types';
import { Screen } from '@/components/Screen';

/**
 * Meetings Tab Component
 * 
 * Manages meetings with four tabs:
 * - Upcoming: Accepted meetings (scheduled meetings)
 * - Incoming: Pending meeting requests received
 * - Sent: Pending meeting requests sent
 * - Processed: Accepted/declined/cancelled meetings (historical)
 * 
 * Features:
 * - Accept/decline functionality for incoming meetings
 * - Meeting status tracking
 * - Pull-to-refresh support
 * - Memoized render functions for performance
 * 
 * @component
 * @returns {JSX.Element} Meetings screen with tabbed interface
 */
export default function MeetingsScreen() {
  const router = useRouter();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [incomingMeetings, setIncomingMeetings] = useState<Meeting[]>([]);
  const [sentMeetings, setSentMeetings] = useState<Meeting[]>([]);
  const [processedMeetings, setProcessedMeetings] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'incoming' | 'sent' | 'processed'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [respondingMeetingId, setRespondingMeetingId] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const normalizeEmail = (email: string | undefined | null): string =>
    (email || '').trim().toLowerCase();

  const loadMeetings = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setUpcomingMeetings([]);
        setIncomingMeetings([]);
        setSentMeetings([]);
        setProcessedMeetings([]);
        isLoadingRef.current = false;
        return;
      }

      const user = safeParseJSON<{ email: string }>(
        userData,
        (data): data is { email: string } => typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
        null
      );
      
      if (!user) {
        setUpcomingMeetings([]);
        setIncomingMeetings([]);
        setSentMeetings([]);
        setProcessedMeetings([]);
        isLoadingRef.current = false;
        return;
      }
      
      const userEmail = user.email;
      const normalizedUserEmail = normalizeEmail(userEmail);
      setUserEmail(userEmail);

      // Load all meetings
      let allMeetings: Meeting[] = [];
      try {
        allMeetings = await hybridGetUserMeetings(userEmail);
        logger.info('Meetings loaded for meetings tab', { count: allMeetings.length });
      } catch (error) {
        logger.warn('Failed to load meetings for meetings tab', {
          error: error instanceof Error ? error.message : String(error),
        });
        allMeetings = [];
      }

      // Exclude self-meetings where organizer and participant are the same user
      const visibleMeetings = allMeetings.filter((m) => {
        const organizer = normalizeEmail(m.organizerEmail);
        const participant = normalizeEmail(m.participantEmail);
        return !(organizer === normalizedUserEmail && participant === normalizedUserEmail);
      });
      
      // Upcoming: Accepted meetings in the future (scheduled meetings, sorted by date)
      const now = new Date();
      const upcoming = visibleMeetings
        .filter((m) => {
          if (m.status !== 'accepted') return false;
          const meetingDate = new Date(m.date);
          return meetingDate >= now;
        })
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB; // Earliest first (upcoming)
        });
      
      // Incoming: Pending meetings where user is participant,
      // excluding self-sent meetings (organizer === participant === user)
      const incoming = visibleMeetings
        .filter(m => {
          const participant = normalizeEmail(m.participantEmail);
          const organizer = normalizeEmail(m.organizerEmail);
          return (
            participant === normalizedUserEmail &&
            organizer !== normalizedUserEmail &&
            m.status === 'pending'
          );
        })
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Most recent first
        });
      
      // Sent: Pending meetings where user is organizer
      const sent = visibleMeetings
        .filter(m => normalizeEmail(m.organizerEmail) === normalizedUserEmail && m.status === 'pending')
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Most recent first
        });
      
      // Processed: Accepted/declined/cancelled meetings (excluding upcoming accepted ones)
      // This shows historical meetings that are not upcoming
      const processed = visibleMeetings
        .filter(m => {
          // Include declined/cancelled, and accepted meetings that are in the past
          if (m.status === 'declined' || m.status === 'cancelled') {
            return true;
          }
          if (m.status === 'accepted') {
            // Only include accepted meetings that are in the past
            const meetingDate = new Date(m.date);
            const now = new Date();
            return meetingDate < now;
          }
          return false;
        })
        .sort((a, b) => {
          const dateA = new Date(a.respondedAt || a.updatedAt || a.createdAt).getTime();
          const dateB = new Date(b.respondedAt || b.updatedAt || b.createdAt).getTime();
          return dateB - dateA; // Most recent first
        });
      
      setUpcomingMeetings(upcoming);
      setIncomingMeetings(incoming);
      setSentMeetings(sent);
      setProcessedMeetings(processed);
      
      logger.info('Meetings organized', {
        upcoming: upcoming.length,
        incoming: incoming.length,
        sent: sent.length,
        processed: processed.length,
      });
    } catch (error) {
      logger.error('Error loading meetings', error instanceof Error ? error : new Error(String(error)));
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMeetings();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLoadingRef.current && hasLoadedRef.current) {
        loadMeetings();
      }
    }, [loadMeetings])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetings();
    setRefreshing(false);
  };

  const handleMeetingResponse = useCallback(async (meetingId: string, meeting: Meeting, accepted: boolean) => {
    try {
      setRespondingMeetingId(meetingId);
      const updateData: Partial<Meeting> = {
        status: accepted ? 'accepted' : 'declined',
        respondedAt: new Date().toISOString(),
      };
      await hybridUpdateMeeting(meetingId, updateData);
      if (accepted) {
        const meetingWithUpdate: Meeting = { ...meeting, ...updateData, status: 'accepted' };
        try {
          await scheduleMeetingNotifications(meetingWithUpdate);
        } catch (e) {
          logger.warn('Failed to schedule meeting notifications', { meetingId });
        }
      } else {
        try {
          await cancelMeetingNotifications(meetingId);
        } catch (e) {
          logger.warn('Failed to cancel meeting notifications', { meetingId });
        }
      }
      Alert.alert(
        'Success',
        accepted ? 'Meeting accepted! It has been added to your calendar.' : 'Meeting declined.',
        [{ text: 'OK', onPress: () => loadMeetings() }]
      );
      logger.info('Meeting response submitted', { meetingId, accepted });
    } catch (error) {
      logger.error('Error responding to meeting', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to respond to meeting. Please try again.');
    } finally {
      setRespondingMeetingId(null);
    }
  }, [loadMeetings]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMeetingItem = useCallback(({ item }: { item: Meeting }) => {
    const normalizedUserEmail = normalizeEmail(userEmail);
    const participantEmail = normalizeEmail(item.participantEmail);
    const organizerEmail = normalizeEmail(item.organizerEmail);

    const isSelfMeeting =
      participantEmail === organizerEmail &&
      organizerEmail === normalizedUserEmail;

    // You are "receiver" only if you're the participant and it's not a self-sent meeting
    const isReceiver = participantEmail === normalizedUserEmail && !isSelfMeeting;

    const otherPerson = isReceiver
      ? { name: item.organizerName, email: item.organizerEmail }
      : { name: item.participantName, email: item.participantEmail };
    
    const meetingDate = new Date(item.date);
    const dateStr = formatDate(item.date);
    const timeStr = formatTime(item.date);
    
    return (
      <TouchableOpacity
        style={styles.meetingCard}
        onPress={() => {
          // For pending incoming, Accept/Decline are shown inline; only navigate for accepted or when viewing.
          if (item.status === 'accepted' || (item.status === 'pending' && !isReceiver)) {
            router.push({
              pathname: '/meeting/respond',
              params: { meetingId: item.id },
            });
          }
        }}
        accessibilityLabel={`Meeting: ${item.title} with ${otherPerson.name}`}
        accessibilityHint={
          item.status === 'pending' && isReceiver
            ? "Use Accept or Decline to respond"
            : item.status === 'accepted'
            ? "Tap to view meeting details"
            : "Tap to view meeting"
        }
      >
        <View style={styles.meetingHeader}>
          <View style={[styles.avatar, { backgroundColor: item.status === 'accepted' ? '#10b981' : '#f59e0b' }]}>
            <Ionicons 
              name={item.status === 'accepted' ? "checkmark-circle" : "calendar"} 
              size={24} 
              color="#fff" 
            />
          </View>
          <View style={styles.meetingInfo}>
            <Text style={styles.meetingTitle}>{item.title}</Text>
            <Text style={styles.meetingPerson}>
              {isReceiver ? `From: ${otherPerson.name}` : `To: ${otherPerson.name}`}
            </Text>
            <Text style={styles.meetingDate}>
              {dateStr} at {timeStr}
            </Text>
            {item.duration && (
              <Text style={styles.meetingDuration}>
                Duration: {item.duration} minutes
              </Text>
            )}
          </View>
        </View>

        {item.description && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText} numberOfLines={2}>{item.description}</Text>
          </View>
        )}

        <View style={styles.statusContainer}>
          {item.status === 'pending' && isReceiver && (
            <View style={styles.actions}>
              {respondingMeetingId === item.id ? (
                <ActivityIndicator size="small" color="#10b981" style={styles.respondingSpinner} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleMeetingResponse(item.id, item, true)}
                    accessibilityLabel={`Accept meeting request from ${otherPerson.name}`}
                    accessibilityHint="Tap to accept this meeting"
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleMeetingResponse(item.id, item, false)}
                    accessibilityLabel={`Decline meeting request from ${otherPerson.name}`}
                    accessibilityHint="Tap to decline this meeting"
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          
          {item.status === 'pending' && !isReceiver && (
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.statusTextPending}>Pending Response</Text>
            </View>
          )}

          {item.status === 'accepted' && (
            <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.statusTextAccepted}>Accepted</Text>
            </View>
          )}

          {item.status === 'declined' && (
            <View style={[styles.statusBadge, styles.statusBadgeDeclined]}>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={styles.statusTextDeclined}>Declined</Text>
            </View>
          )}

          {item.status === 'cancelled' && (
            <View style={[styles.statusBadge, styles.statusBadgeCancelled]}>
              <Ionicons name="ban" size={16} color="#6b7280" />
              <Text style={styles.statusTextCancelled}>Cancelled</Text>
            </View>
          )}
        </View>

        {item.locationType === 'virtual' && item.meetingLink && (
          <View style={styles.locationContainer}>
            <Ionicons name="videocam" size={16} color="#2563eb" />
            <Text style={styles.locationText}>{item.meetingLink}</Text>
          </View>
        )}

        {item.locationType === 'in-person' && item.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#2563eb" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        )}

        {item.locationType === 'phone' && item.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="call" size={16} color="#2563eb" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [userEmail, router, handleMeetingResponse, respondingMeetingId]);

  const getDisplayMeetings = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingMeetings;
      case 'incoming':
        return incomingMeetings;
      case 'sent':
        return sentMeetings;
      case 'processed':
        return processedMeetings;
      default:
        return [];
    }
  };

  const displayMeetings = getDisplayMeetings();

  if (loading && !hasLoadedRef.current) {
    return (
      <Screen style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading meetings...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meetings</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
          accessibilityLabel="Upcoming meetings tab"
          accessibilityHint={`Tap to view upcoming meetings. ${upcomingMeetings.length} meetings`}
          accessibilityState={{ selected: activeTab === 'upcoming' }}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingMeetings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
          accessibilityLabel="Incoming meetings tab"
          accessibilityHint={`Tap to view incoming meeting requests. ${incomingMeetings.length} requests`}
          accessibilityState={{ selected: activeTab === 'incoming' }}
        >
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
            Incoming ({incomingMeetings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
          accessibilityLabel="Sent meetings tab"
          accessibilityHint={`Tap to view sent meeting requests. ${sentMeetings.length} requests`}
          accessibilityState={{ selected: activeTab === 'sent' }}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({sentMeetings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'processed' && styles.activeTab]}
          onPress={() => setActiveTab('processed')}
          accessibilityLabel="Processed meetings tab"
          accessibilityHint={`Tap to view processed meetings. ${processedMeetings.length} meetings`}
          accessibilityState={{ selected: activeTab === 'processed' }}
        >
          <Text style={[styles.tabText, activeTab === 'processed' && styles.activeTabText]}>
            Processed ({processedMeetings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {displayMeetings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name={activeTab === 'upcoming' ? "calendar-outline" : "calendar"} 
            size={64} 
            color="#cbd5e1" 
          />
          <Text style={styles.emptyStateText}>
            {activeTab === 'upcoming' && 'No upcoming meetings'}
            {activeTab === 'incoming' && 'No incoming meeting requests'}
            {activeTab === 'sent' && 'No sent meeting requests'}
            {activeTab === 'processed' && 'No processed meetings'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {activeTab === 'upcoming' && 'Accepted meetings will appear here'}
            {activeTab === 'incoming' && 'Meeting requests you receive will appear here'}
            {activeTab === 'sent' && 'Meeting requests you send will appear here'}
            {activeTab === 'processed' && 'Declined, cancelled, or past meetings will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayMeetings}
          renderItem={renderMeetingItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#2563eb',
  },
  list: {
    padding: 16,
    paddingTop: 20, // Add space at the top
  },
  meetingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  meetingHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  meetingPerson: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  meetingDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  meetingDuration: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noteContainer: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  noteText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  statusContainer: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  respondingSpinner: {
    marginVertical: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusBadgeAccepted: {
    backgroundColor: '#d1fae5',
  },
  statusBadgeDeclined: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeCancelled: {
    backgroundColor: '#f3f4f6',
  },
  statusTextPending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  statusTextAccepted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  statusTextDeclined: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  statusTextCancelled: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#2563eb',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
});
