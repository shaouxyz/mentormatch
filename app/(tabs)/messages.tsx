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
import { hybridGetProfile } from '@/services/hybridProfileService';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { getTotalUnread, getUnreadForUser } from '@/utils/unreadMessages';
import { Conversation } from '@/types/types';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';

/**
 * Messages Screen Component
 *
 * Displays list of all conversations (chats) for the current user.
 * Shows last message, time, and unread count. Requests are in the Requests tab.
 */
export default function MessagesScreen() {
  const router = useRouter();
  const { setTotalUnread } = useUnreadMessages();
  const [conversations, setConversations] = useState<Conversation[]>([]);
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

      const userConversations = await hybridGetUserConversations(user.email);
      const email = user.email || '';
      const norm = email.trim().toLowerCase();

      // Resolve "Unknown" participant names from profiles
      let updated = false;
      for (const conv of userConversations) {
        const otherEmail = conv.participants?.find(
          (p) => (p || '').trim().toLowerCase() !== norm
        );
        if (!otherEmail) continue;
        const names = conv.participantNames || {};
        const existingName =
          names[otherEmail] ||
          names[otherEmail.toLowerCase()] ||
          Object.entries(names).find(
            ([k]) => (k || '').trim().toLowerCase() === otherEmail.trim().toLowerCase()
          )?.[1];
        if (!existingName || existingName === 'Unknown') {
          try {
            const profile = await hybridGetProfile(otherEmail);
            if (profile?.name) {
              if (!conv.participantNames) conv.participantNames = {};
              conv.participantNames[otherEmail] = profile.name;
              updated = true;
              logger.info('Resolved unknown participant name', { email: otherEmail, name: profile.name });
            }
          } catch {
            // Profile lookup failed; leave as-is
          }
        }
      }

      setConversations(userConversations);
      const total = getTotalUnread(userConversations, email);
      setTotalUnread(total);
      logger.info('Conversations loaded', { count: userConversations.length, totalUnread: total, namesResolved: updated });
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

  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipant = getOtherParticipant(item);
    const unreadCount = getUnreadForUser(item, currentUserEmail);
    const hasUnread = unreadCount > 0;
    const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

    return (
      <TouchableOpacity
        style={[styles.conversationItem, hasUnread && styles.conversationItemUnread]}
        onPress={() => router.push({
          pathname: '/messages/chat',
          params: {
            conversationId: item.id,
            participantEmail: otherParticipant.email,
            participantName: otherParticipant.name,
          },
        })}
        accessibilityLabel={`Conversation with ${otherParticipant.name}${hasUnread ? `, ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : ''}`}
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
            <Text style={[styles.participantName, hasUnread && styles.participantNameUnread]} numberOfLines={1}>
              {otherParticipant.name}
            </Text>
            <View style={styles.headerRight}>
              <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
              {hasUnread && (
                <View style={styles.unreadPill}>
                  <Text style={styles.unreadPillText}>{unreadLabel}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || 'No messages yet'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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

      {conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Connect with mentors or mentees to start messaging
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
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
  conversationItemUnread: {
    backgroundColor: '#f0fdf4',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  participantNameUnread: {
    fontWeight: '700',
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
  unreadPill: {
    backgroundColor: '#25D366',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
