import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

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

export default function RequestsScreen() {
  const router = useRouter();
  const [incomingRequests, setIncomingRequests] = useState<MentorshipRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<MentorshipRequest[]>([]);
  const [processedRequests, setProcessedRequests] = useState<MentorshipRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'processed'>('incoming');
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadRequests = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setIncomingRequests([]);
        setOutgoingRequests([]);
        isLoadingRef.current = false;
        return;
      }

      const user = JSON.parse(userData);
      const userEmail = user.email;
      setUserEmail(userEmail);

      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      if (requestsData) {
        const allRequests: MentorshipRequest[] = JSON.parse(requestsData);
        
        // Incoming: requests where user is mentor and status is pending
        const incoming = allRequests.filter(
          (r) => r.mentorEmail === userEmail && r.status === 'pending'
        );
        
        // Outgoing: all requests where user is requester (including pending)
        const outgoing = allRequests.filter(
          (r) => r.requesterEmail === userEmail && r.status === 'pending'
        );

        // Processed: requests that are accepted or declined (both incoming and outgoing)
        // Sort by respondedAt (most recent first)
        const processed = allRequests
          .filter(
            (r) => 
              (r.status === 'accepted' || r.status === 'declined') &&
              (r.mentorEmail === userEmail || r.requesterEmail === userEmail)
          )
          .sort((a, b) => {
            const dateA = new Date(a.respondedAt || a.createdAt).getTime();
            const dateB = new Date(b.respondedAt || b.createdAt).getTime();
            return dateB - dateA; // Most recent first
          });

        setIncomingRequests(incoming);
        setOutgoingRequests(outgoing);
        setProcessedRequests(processed);
      } else {
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setProcessedRequests([]);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      isLoadingRef.current = false;
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

  const updateRequestStatus = useCallback(async (
    requestId: string,
    status: 'accepted' | 'declined',
    responseNote: string
  ) => {
    try {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      if (requestsData) {
        const requests: MentorshipRequest[] = JSON.parse(requestsData);
        const requestIndex = requests.findIndex((r) => r.id === requestId);

        if (requestIndex !== -1) {
          requests[requestIndex].status = status;
          requests[requestIndex].responseNote = responseNote;
          requests[requestIndex].respondedAt = new Date().toISOString();

          await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));
          
          // Update local state directly instead of reloading
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            const userEmail = user.email;
            
            const incoming = requests.filter(
              (r) => r.mentorEmail === userEmail && r.status === 'pending'
            );
            const outgoing = requests.filter(
              (r) => r.requesterEmail === userEmail && r.status === 'pending'
            );
            const processed = requests
              .filter(
                (r) => 
                  (r.status === 'accepted' || r.status === 'declined') &&
                  (r.mentorEmail === userEmail || r.requesterEmail === userEmail)
              )
              .sort((a, b) => {
                const dateA = new Date(a.respondedAt || a.createdAt).getTime();
                const dateB = new Date(b.respondedAt || b.createdAt).getTime();
                return dateB - dateA; // Most recent first
              });

            setIncomingRequests(incoming);
            setOutgoingRequests(outgoing);
            setProcessedRequests(processed);
          }

          Alert.alert(
            'Success',
            `Request ${status === 'accepted' ? 'accepted' : 'declined'} successfully!`
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update request. Please try again.');
      console.error('Error updating request:', error);
    }
  }, []);

  const renderIncomingRequest = ({ item }: { item: MentorshipRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.requesterName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.requesterName}</Text>
          <Text style={styles.requestEmail}>{item.requesterEmail}</Text>
          <Text style={styles.requestDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.note && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Message:</Text>
          <Text style={styles.noteText}>{item.note}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAccept(item)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleDecline(item)}
        >
          <Ionicons name="close-circle" size={20} color="#fff" />
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOutgoingRequest = ({ item }: { item: MentorshipRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.mentorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.mentorName}</Text>
          <Text style={styles.requestEmail}>{item.mentorEmail}</Text>
          <Text style={styles.requestDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.note && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Your message:</Text>
          <Text style={styles.noteText}>{item.note}</Text>
        </View>
      )}

      <View style={styles.statusContainer}>
        {item.status === 'pending' && (
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={16} color="#f59e0b" />
            <Text style={styles.statusTextPending}>Pending</Text>
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
      </View>

      {item.responseNote && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Response:</Text>
          <Text style={styles.responseText}>{item.responseNote}</Text>
        </View>
      )}
    </View>
  );

  const renderProcessedRequest = ({ item }: { item: MentorshipRequest }) => {
    // Determine if this was an incoming or outgoing request
    let otherPersonName = '';
    let otherPersonEmail = '';
    let isRequester = false;

    if (userEmail) {
      if (item.mentorEmail === userEmail) {
        // User was the mentor, so requester is the other person
        otherPersonName = item.requesterName;
        otherPersonEmail = item.requesterEmail;
        isRequester = false;
      } else if (item.requesterEmail === userEmail) {
        // User was the requester, so mentor is the other person
        otherPersonName = item.mentorName;
        otherPersonEmail = item.mentorEmail;
        isRequester = true;
      } else {
        // Fallback
        otherPersonName = item.requesterName;
        otherPersonEmail = item.requesterEmail;
      }
    } else {
      // Fallback if userEmail not loaded yet
      otherPersonName = item.requesterName;
      otherPersonEmail = item.requesterEmail;
    }

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherPersonName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{otherPersonName}</Text>
            <Text style={styles.requestEmail}>{otherPersonEmail}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.respondedAt || item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
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
        </View>

        {item.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>
              {isRequester ? 'Your message:' : 'Request message:'}
            </Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}

        {item.responseNote && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Response:</Text>
            <Text style={styles.responseText}>{item.responseNote}</Text>
          </View>
        )}
      </View>
    );
  };

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

  const getRenderFunction = () => {
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
  };

  const displayRequests = getDisplayRequests();

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
});
