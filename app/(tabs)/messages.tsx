import { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { hybridGetUserConversations } from '@/services/hybridMessageService';
import { hybridGetPendingMeetings, hybridGetUserMeetings } from '@/services/hybridMeetingService';
import { hybridGetAllRequestsForUser } from '@/services/hybridRequestService';
import { Conversation, MentorshipRequest, Meeting } from '@/types/types';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { safeParseJSON, validateMentorshipRequestSchema } from '@/utils/schemaValidation';

/**
 * Messages Screen Component
 * 
 * Displays list of all conversations for the current user
 * Shows last message, time, and unread count
 */
type MessageItem = 
  | { type: 'conversation'; data: Conversation }
  | { type: 'request'; data: MentorshipRequest }
  | { type: 'meeting'; data: Meeting };

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  const loadConversations = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        router.replace('/login');
        return;
      }

      const user = JSON.parse(userData);
      setCurrentUserEmail(user.email);

      // Load conversations
      const userConversations = await hybridGetUserConversations(user.email);
      setConversations(userConversations);
      
      // Load pending requests using hybrid service (Firebase first, then local fallback)
      let pendingRequests: MentorshipRequest[] = [];
      try {
        const { all: allRequests } = await hybridGetAllRequestsForUser(user.email);
        
        // Get pending requests where user is involved
        pendingRequests = allRequests.filter(
          (r) => 
            r.status === 'pending' &&
            (r.mentorEmail === user.email || r.requesterEmail === user.email)
        );
        
        // Sort by creation date (most recent first)
        pendingRequests.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (error) {
        logger.warn('Failed to load pending requests', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      
      setRequests(pendingRequests);
      
      // Load all meetings (pending and scheduled/accepted)
      let allUserMeetings: Meeting[] = [];
      try {
        allUserMeetings = await hybridGetUserMeetings(user.email);
        // Filter to show pending and accepted meetings (exclude declined/cancelled)
        const relevantMeetings = allUserMeetings.filter(
          m => m.status === 'pending' || m.status === 'accepted'
        );
        setMeetings(relevantMeetings);
        logger.info('Meetings loaded', { 
          total: allUserMeetings.length,
          relevant: relevantMeetings.length 
        });
      } catch (error) {
        logger.warn('Failed to load meetings', {
          error: error instanceof Error ? error.message : String(error),
        });
        setMeetings([]);
      }
      
      logger.info('Conversations, requests, and meetings loaded', { 
        conversations: userConversations.length,
        requests: pendingRequests.length,
        meetings: allUserMeetings.filter(m => m.status === 'pending' || m.status === 'accepted').length
      });
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const getOtherParticipant = (conversation: Conversation) => {
    const currentNorm = (currentUserEmail || '').trim().toLowerCase();
    const otherEmail = conversation.participants?.find(
      (p) => (p || '').trim().toLowerCase() !== currentNorm
    );
    const key = otherEmail || '';
    const name =
      key &&
      (conversation.participantNames?.[key] ||
        conversation.participantNames?.[key.toLowerCase()] ||
        Object.entries(conversation.participantNames || {}).find(
          ([k]) => (k || '').trim().toLowerCase() === key.toLowerCase()
        )?.[1]);
    return {
      email: key,
      name: name || 'Unknown',
    };
  };

  const formatTime = (dateString?: string) => {
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
  };

  // Combine conversations, requests, and meetings into a single list
  const getCombinedItems = (): MessageItem[] => {
    const items: MessageItem[] = [];
    
    // Add meeting requests first (highest priority)
    meetings.forEach(meeting => {
      items.push({ type: 'meeting', data: meeting });
    });
    
    // Add mentorship requests
    requests.forEach(request => {
      items.push({ type: 'request', data: request });
    });
    
    // Add conversations
    conversations.forEach(conversation => {
      items.push({ type: 'conversation', data: conversation });
    });
    
    // Sort by date (most recent first)
    items.sort((a, b) => {
      const dateA = a.type === 'conversation' 
        ? new Date(a.data.lastMessageAt || a.data.updatedAt).getTime()
        : new Date(a.data.createdAt).getTime();
      const dateB = b.type === 'conversation'
        ? new Date(b.data.lastMessageAt || b.data.updatedAt).getTime()
        : new Date(b.data.createdAt).getTime();
      return dateB - dateA;
    });
    
    return items;
  };

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const isReceiver = item.participantEmail === currentUserEmail;
    const otherPerson = isReceiver 
      ? { name: item.organizerName, email: item.organizerEmail }
      : { name: item.participantName, email: item.participantEmail };
    
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    
    // Format meeting date/time for display
    const meetingDate = new Date(item.date);
    const dateStr = meetingDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = meetingDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem, 
          isPending ? styles.meetingItem : styles.scheduledMeetingItem
        ]}
        onPress={() => {
          if (isPending) {
            router.push({
              pathname: '/meeting/respond',
              params: { meetingId: item.id },
            });
          } else {
            router.push({
              pathname: '/meeting/upcoming',
            });
          }
        }}
        accessibilityLabel={
          isPending 
            ? `Meeting request from ${otherPerson.name}` 
            : `Scheduled meeting with ${otherPerson.name}`
        }
        accessibilityHint={
          isPending 
            ? "Tap to view and respond to meeting request"
            : "Tap to view meeting details"
        }
      >
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatar, 
            isPending ? styles.meetingAvatar : styles.scheduledMeetingAvatar
          ]}>
            <Ionicons 
              name={isPending ? "calendar" : "calendar-check"} 
              size={24} 
              color="#fff" 
            />
          </View>
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.requestHeaderContent}>
              <Text style={styles.participantName}>{otherPerson.name}</Text>
              <View style={[
                styles.meetingBadge,
                isAccepted && styles.scheduledMeetingBadge
              ]}>
                <Text style={[
                  styles.meetingBadgeText,
                  isAccepted && styles.scheduledMeetingBadgeText
                ]}>
                  {isPending ? 'Meeting Request' : 'Scheduled Meeting'}
                </Text>
              </View>
            </View>
            <Text style={styles.timeText}>
              {isPending ? formatTime(item.createdAt) : `${dateStr} ${timeStr}`}
            </Text>
          </View>
          
          <View style={styles.conversationFooter}>
            <Text
              style={styles.lastMessage}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequest = ({ item }: { item: MentorshipRequest }) => {
    const isIncoming = item.mentorEmail === currentUserEmail;
    const otherPerson = isIncoming 
      ? { name: item.requesterName, email: item.requesterEmail }
      : { name: item.mentorName, email: item.mentorEmail };
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, styles.requestItem]}
        onPress={() => router.push({
          pathname: '/request/respond',
          params: { request: JSON.stringify(item) },
        })}
        accessibilityLabel={`${isIncoming ? 'Incoming' : 'Outgoing'} request from ${otherPerson.name}`}
        accessibilityHint="Tap to view and respond to request"
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.requestAvatar]}>
            <Ionicons 
              name={isIncoming ? "mail" : "send"} 
              size={24} 
              color="#fff" 
            />
          </View>
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.requestHeaderContent}>
              <Text style={styles.participantName}>{otherPerson.name}</Text>
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>
                  {isIncoming ? 'Incoming Request' : 'Sent Request'}
                </Text>
              </View>
            </View>
            <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
          </View>
          
          <View style={styles.conversationFooter}>
            <Text
              style={styles.lastMessage}
              numberOfLines={1}
            >
              {item.note || 'No message'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipant = getOtherParticipant(item);
    const currentNorm = (currentUserEmail || '').trim().toLowerCase();
    const unreadCount =
      item.unreadCount?.[currentUserEmail] ??
      item.unreadCount?.[currentNorm] ??
      (currentNorm && item.unreadCount
        ? Object.entries(item.unreadCount).find(
            ([k]) => (k || '').trim().toLowerCase() === currentNorm
          )?.[1]
        : undefined) ??
      0;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push({
          pathname: '/messages/chat',
          params: {
            conversationId: item.id,
            participantEmail: otherParticipant.email,
            participantName: otherParticipant.name,
          },
        })}
        accessibilityLabel={`Conversation with ${otherParticipant.name}`}
        accessibilityHint="Tap to open chat"
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherParticipant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName}>{otherParticipant.name}</Text>
            <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          
          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: MessageItem }) => {
    if (item.type === 'meeting') {
      return renderMeeting({ item: item.data });
    } else if (item.type === 'request') {
      return renderRequest({ item: item.data });
    } else {
      return renderConversation({ item: item.data });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {conversations.length === 0 && requests.length === 0 && meetings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>No messages or requests yet</Text>
          <Text style={styles.emptySubtext}>
            Connect with mentors or mentees to start messaging
          </Text>
        </View>
      ) : (
        <FlatList
          data={getCombinedItems()}
          renderItem={renderItem}
          keyExtractor={(item) => {
            if (item.type === 'conversation') return item.data.id;
            if (item.type === 'request') return `request-${item.data.id}`;
            return `meeting-${item.data.id}`;
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#1e293b',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestItem: {
    backgroundColor: '#f8fafc',
  },
  requestAvatar: {
    backgroundColor: '#f59e0b',
  },
  requestHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  meetingItem: {
    backgroundColor: '#f0f9ff',
  },
  meetingAvatar: {
    backgroundColor: '#10b981',
  },
  meetingBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  meetingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  scheduledMeetingItem: {
    backgroundColor: '#f0fdf4',
  },
  scheduledMeetingAvatar: {
    backgroundColor: '#059669',
  },
  scheduledMeetingBadge: {
    backgroundColor: '#d1fae5',
  },
  scheduledMeetingBadgeText: {
    color: '#059669',
  },
});
