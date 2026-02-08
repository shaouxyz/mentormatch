import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/utils/logger';
import { safeParseJSON, validateMentorshipRequestSchema } from '@/utils/schemaValidation';
import { hybridGetAllRequestsForUser } from '@/services/hybridRequestService';
import { Screen } from '@/components/Screen';

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
 * Requests Tab Component
 *
 * Manages mentorship requests only (messages are in the Messages tab):
 * - Incoming: Requests received from others (pending)
 * - Sent: Requests sent to others (pending)
 * - Processed: Accepted/declined requests
 *
 * @component
 * @returns {JSX.Element} Requests screen with tabbed interface
 */
type RequestItem = { type: 'mentorship'; data: MentorshipRequest };

const normalizeEmail = (email: string | undefined | null): string =>
  (email || '').trim().toLowerCase();

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function RequestsScreen() {
  const router = useRouter();
  const [incomingRequests, setIncomingRequests] = useState<RequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<RequestItem[]>([]);
  const [processedRequests, setProcessedRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'processed'>('incoming');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadRequests = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setIncomingRequests([]);
        setOutgoingRequests([]);
        isLoadingRef.current = false;
        return;
      }

      const user = safeParseJSON<{ email: string }>(
        userData,
        (data): data is { email: string } => typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
        null
      );
      
      if (!user) {
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setProcessedRequests([]);
        isLoadingRef.current = false;
        return;
      }
      
      const userEmail = user.email;
      const normalizedUserEmail = normalizeEmail(userEmail);
      setUserEmail(userEmail);

      // Use hybrid service to get requests (Firebase first, then local fallback)
      const { all: allRequestsRaw } = await hybridGetAllRequestsForUser(userEmail);
      // Deduplicate requests by id to avoid duplicate FlatList keys
      const allRequests = dedupeById(allRequestsRaw);
      
      // Incoming: requests where user is mentor and status is pending,
      // excluding self-sent requests (requester === mentor === user)
      const incoming = allRequests.filter(
        (r) => {
          const mentor = normalizeEmail(r.mentorEmail);
          const requester = normalizeEmail(r.requesterEmail);
          return (
            mentor === normalizedUserEmail &&
            r.status === 'pending' &&
            requester !== normalizedUserEmail
          );
        }
      );
      
      // Outgoing: all requests where user is requester (including pending)
      const outgoing = allRequests.filter(
        (r) => normalizeEmail(r.requesterEmail) === normalizedUserEmail && r.status === 'pending'
      );

      // Processed: requests that are accepted or declined (both incoming and outgoing)
      // Sort by respondedAt (most recent first)
      const processed = allRequests
        .filter(
          (r) =>
            (r.status === 'accepted' || r.status === 'declined') &&
            (normalizeEmail(r.mentorEmail) === normalizedUserEmail || normalizeEmail(r.requesterEmail) === normalizedUserEmail)
        )
        .sort((a, b) => {
          const dateA = new Date(a.respondedAt || a.createdAt).getTime();
          const dateB = new Date(b.respondedAt || b.createdAt).getTime();
          return dateB - dateA;
        });

      const incomingItems: RequestItem[] = incoming.map((r) => ({ type: 'mentorship', data: r }));
      const outgoingItems: RequestItem[] = outgoing.map((r) => ({ type: 'mentorship', data: r }));
      const processedItems: RequestItem[] = processed.map((r) => ({ type: 'mentorship', data: r }));

      setIncomingRequests(incomingItems);
      setOutgoingRequests(outgoingItems);
      setProcessedRequests(processedItems);
    } catch (error) {
      logger.error('Error loading requests', error instanceof Error ? error : new Error(String(error)));
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadRequests();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLoadingRef.current && hasLoadedRef.current) {
        loadRequests();
      }
    }, [loadRequests])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleAccept = async (request: MentorshipRequest) => {
    router.push({
      pathname: '/request/respond',
      params: { request: JSON.stringify(request) },
    });
  };

  const handleDecline = async (request: MentorshipRequest) => {
    router.push({
      pathname: '/request/respond',
      params: { request: JSON.stringify(request) },
    });
  };

  const formatTime = useCallback((dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  const renderIncomingRequest = useCallback(({ item }: { item: RequestItem }) => {
    const request = item.data;
    return (
      <View style={styles.requestCard}>
        <Text style={styles.mentorRequestLabel}>Mentorship request</Text>
        <TouchableOpacity
          style={styles.requestHeader}
          onPress={() => router.push({ pathname: '/profile/view', params: { email: request.requesterEmail } })}
          accessibilityLabel={`View ${request.requesterName}'s profile`}
          accessibilityHint="Tap to open requester's profile"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {request.requesterName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{request.requesterName}</Text>
            <Text style={styles.requestEmail}>{request.requesterEmail}</Text>
            <Text style={styles.requestDate}>
              {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {request.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Message:</Text>
            <Text style={styles.noteText}>{request.note}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(request)}
            accessibilityLabel={`Accept request from ${request.requesterName}`}
            accessibilityHint="Tap to accept this mentorship request"
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDecline(request)}
            accessibilityLabel={`Decline request from ${request.requesterName}`}
            accessibilityHint="Tap to decline this mentorship request"
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleAccept, handleDecline, router]);

  const renderOutgoingRequest = useCallback(({ item }: { item: RequestItem }) => {
    const request = item.data;
      return (
        <View style={styles.requestCard}>
          <Text style={styles.mentorRequestLabel}>Your mentor request</Text>
          <TouchableOpacity
            style={styles.requestHeader}
            onPress={() => router.push({ pathname: '/profile/view', params: { email: request.mentorEmail } })}
            accessibilityLabel={`View ${request.mentorName}'s profile`}
            accessibilityHint="Tap to open mentor's profile"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {request.mentorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>{request.mentorName}</Text>
              <Text style={styles.requestEmail}>{request.mentorEmail}</Text>
              <Text style={styles.requestDate}>
                {new Date(request.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {request.note && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Your message:</Text>
              <Text style={styles.noteText}>{request.note}</Text>
            </View>
          )}

          <View style={styles.statusContainer}>
            {request.status === 'pending' && (
              <View style={styles.statusBadge}>
                <Ionicons name="time-outline" size={16} color="#f59e0b" />
                <Text style={styles.statusTextPending}>Pending</Text>
              </View>
            )}
            {request.status === 'accepted' && (
              <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.statusTextAccepted}>Accepted</Text>
              </View>
            )}
            {request.status === 'declined' && (
              <View style={[styles.statusBadge, styles.statusBadgeDeclined]}>
                <Ionicons name="close-circle" size={16} color="#ef4444" />
                <Text style={styles.statusTextDeclined}>Declined</Text>
              </View>
            )}
          </View>

          {request.responseNote && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseLabel}>Response:</Text>
              <Text style={styles.responseText}>{request.responseNote}</Text>
            </View>
          )}
        </View>
      );
  }, [router]);

  const renderProcessedRequest = useCallback(({ item }: { item: RequestItem }) => {
    const request = item.data;
    // Determine if this was an incoming or outgoing request
    let otherPersonName = '';
    let otherPersonEmail = '';
    let isRequester = false;

    if (userEmail) {
      if (request.mentorEmail === userEmail) {
        // User was the mentor, so requester is the other person
        otherPersonName = request.requesterName;
        otherPersonEmail = request.requesterEmail;
        isRequester = false;
      } else if (request.requesterEmail === userEmail) {
        // User was the requester, so mentor is the other person
        otherPersonName = request.mentorName;
        otherPersonEmail = request.mentorEmail;
        isRequester = true;
      } else {
        // Fallback
        otherPersonName = request.requesterName;
        otherPersonEmail = request.requesterEmail;
      }
    } else {
      // Fallback if userEmail not loaded yet
      otherPersonName = request.requesterName;
      otherPersonEmail = request.requesterEmail;
    }

    const roleSuffix =
      userEmail && (request.mentorEmail === userEmail || request.requesterEmail === userEmail)
        ? isRequester
          ? ' (Mentee)'
          : ' (Mentor)'
        : '';

    return (
      <View style={styles.requestCard}>
        <Text style={styles.mentorRequestLabel}>Mentorship request{roleSuffix}</Text>
        <TouchableOpacity
          style={styles.requestHeader}
          onPress={() => router.push({ pathname: '/profile/view', params: { email: otherPersonEmail } })}
          accessibilityLabel={`View ${otherPersonName}'s profile`}
          accessibilityHint="Tap to open profile"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherPersonName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{otherPersonName}</Text>
            <Text style={styles.requestEmail}>{otherPersonEmail}</Text>
            <Text style={styles.requestDate}>
              {new Date(request.respondedAt || request.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          {request.status === 'accepted' && (
            <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.statusTextAccepted}>Accepted{roleSuffix}</Text>
            </View>
          )}
          {request.status === 'declined' && (
            <View style={[styles.statusBadge, styles.statusBadgeDeclined]}>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={styles.statusTextDeclined}>Declined</Text>
            </View>
          )}
        </View>

        {request.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>
              {isRequester ? 'Your message:' : 'Request message:'}
            </Text>
            <Text style={styles.noteText}>{request.note}</Text>
          </View>
        )}

        {request.responseNote && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Response:</Text>
            <Text style={styles.responseText}>{request.responseNote}</Text>
          </View>
        )}
      </View>
    );
  }, [userEmail, router]);

  const getDisplayRequests = () => {
    switch (activeTab) {
      case 'incoming':
        return incomingRequests;
      case 'outgoing':
        return outgoingRequests;
      case 'processed':
        return processedRequests;
      default:
        return [];
    }
  };

  const getRenderFunction = useCallback(() => {
    switch (activeTab) {
      case 'incoming':
        return renderIncomingRequest;
      case 'outgoing':
        return renderOutgoingRequest;
      case 'processed':
        return renderProcessedRequest;
      default:
        return renderIncomingRequest;
    }
  }, [activeTab, renderIncomingRequest, renderOutgoingRequest, renderProcessedRequest]);

  const displayRequests = getDisplayRequests();

  if (loading && !hasLoadedRef.current) {
    return (
      <Screen style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages & Requests</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
          accessibilityLabel="Incoming requests tab"
          accessibilityHint={`Tap to view incoming requests. ${incomingRequests.length} requests`}
          accessibilityState={{ selected: activeTab === 'incoming' }}
        >
          <Ionicons
            name="mail"
            size={20}
            color={activeTab === 'incoming' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'incoming' && styles.activeTabText,
            ]}
          >
            Incoming ({incomingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
          onPress={() => setActiveTab('outgoing')}
          accessibilityLabel="Sent requests tab"
          accessibilityHint={`Tap to view sent requests. ${outgoingRequests.length} requests`}
          accessibilityState={{ selected: activeTab === 'outgoing' }}
        >
          <Ionicons
            name="send"
            size={20}
            color={activeTab === 'outgoing' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'outgoing' && styles.activeTabText,
            ]}
          >
            Sent ({outgoingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'processed' && styles.activeTab]}
          onPress={() => setActiveTab('processed')}
          accessibilityLabel="Processed requests tab"
          accessibilityHint={`Tap to view processed requests. ${processedRequests.length} requests`}
          accessibilityState={{ selected: activeTab === 'processed' }}
        >
          <Ionicons
            name="archive"
            size={20}
            color={activeTab === 'processed' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'processed' && styles.activeTabText,
            ]}
          >
            Processed ({processedRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayRequests}
        renderItem={getRenderFunction()}
        keyExtractor={(item) => `mentorship-${item.data.id}`}
        contentContainerStyle={[styles.list, { paddingTop: 20 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={
                activeTab === 'incoming'
                  ? 'mail-outline'
                  : activeTab === 'outgoing'
                  ? 'send-outline'
                  : 'archive-outline'
              }
              size={64}
              color="#cbd5e1"
            />
            <Text style={styles.emptyStateText}>
              {activeTab === 'incoming'
                ? 'No incoming requests'
                : activeTab === 'outgoing'
                ? 'No sent requests'
                : 'No processed requests'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === 'incoming'
                ? 'Requests from others will appear here'
                : activeTab === 'outgoing'
                ? 'Your mentorship requests will appear here'
                : 'Accepted or declined requests will appear here'}
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#2563eb',
  },
  list: {
    padding: 16,
    paddingTop: 20, // Add space at the top
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mentorRequestLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noteContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 12,
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
  responseContainer: {
    marginTop: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
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
  conversationCard: {
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
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
