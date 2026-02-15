import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { hybridGetUserConversations } from '@/services/hybridMessageService';
import { hybridGetAllRequestsForUser } from '@/services/hybridRequestService';
import { hybridGetUserMeetings } from '@/services/hybridMeetingService';
import { getTotalUnread } from '@/utils/unreadMessages';
import { logger } from '@/utils/logger';
import { Meeting } from '@/types/types';

const normalizeEmail = (email: string | undefined | null): string =>
  (email || '').trim().toLowerCase();

/**
 * Count of incoming pending mentorship requests (user is mentor).
 */
function getIncomingPendingCount(
  allRequests: Array<{ mentorEmail?: string; requesterEmail?: string; status?: string }>,
  userEmail: string
): number {
  const norm = normalizeEmail(userEmail);
  return allRequests.filter(
    (r) =>
      normalizeEmail(r.mentorEmail) === norm &&
      r.status === 'pending' &&
      normalizeEmail(r.requesterEmail) !== norm
  ).length;
}

/**
 * Count of upcoming (accepted, not ended) + incoming (pending, user is participant) meetings.
 * Excludes self-meetings (organizer and participant are the same user).
 */
function getMeetingsBadgeCount(meetings: Meeting[], userEmail: string): number {
  const norm = normalizeEmail(userEmail);
  const visible = meetings.filter((m) => {
    const organizer = normalizeEmail(m.organizerEmail);
    const participant = normalizeEmail(m.participantEmail);
    return !(organizer === norm && participant === norm);
  });
  const now = new Date();
  const getEndTime = (m: Meeting) => {
    const start = new Date(m.date).getTime();
    const durationMs = (m.duration ?? 0) * 60 * 1000;
    return start + durationMs;
  };
  const upcoming = visible.filter((m) => {
    if (m.status !== 'accepted') return false;
    return getEndTime(m) > now.getTime();
  });
  const incoming = visible.filter((m) => {
    if (m.status !== 'pending') return false;
    const participant = normalizeEmail(m.participantEmail);
    const organizer = normalizeEmail(m.organizerEmail);
    return participant === norm && organizer !== norm;
  });
  return upcoming.length + incoming.length;
}

/**
 * Tabs Layout Component
 *
 * Defines the bottom tab navigation structure with:
 * - Discover tab (home)
 * - Mentorship tab
 * - Meetings tab (badge: upcoming + incoming meetings)
 * - Messages tab (badge: unread messages)
 * - Requests tab (badge: incoming pending requests)
 * - Profile tab
 *
 * Loads unread, requests, and meetings counts when tabs are focused for badge indicators.
 */
export default function TabsLayout() {
  const { totalUnread, setTotalUnread } = useUnreadMessages();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [meetingsBadgeCount, setMeetingsBadgeCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (!userData || cancelled) return;
          const user = JSON.parse(userData);
          const email = user?.email;
          if (!email) return;

          const [conversations, requestsResult, meetings] = await Promise.all([
            hybridGetUserConversations(email),
            hybridGetAllRequestsForUser(email),
            hybridGetUserMeetings(email).catch(() => [] as Meeting[]),
          ]);

          if (cancelled) return;

          const total = getTotalUnread(conversations, email);
          setTotalUnread(total);

          const incomingPending = getIncomingPendingCount(requestsResult.all, email);
          setPendingRequestsCount(incomingPending);

          const meetingsCount = getMeetingsBadgeCount(meetings, email);
          setMeetingsBadgeCount(meetingsCount);

          logger.info('Tab badges refreshed', {
            unread: total,
            pendingRequests: incomingPending,
            meetings: meetingsCount,
          });
        } catch (e) {
          if (!cancelled)
            logger.warn('Failed to load tab badges', { error: e instanceof Error ? e.message : String(e) });
        }
      })();
      return () => { cancelled = true; };
    }, [setTotalUnread])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        headerShown: true,
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#1e293b',
        headerTitleStyle: {
          fontSize: 32,
          fontWeight: 'bold',
          color: '#1e293b',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mentorship"
        options={{
          title: 'Mentorship',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          headerShown: false,
          tabBarBadge: meetingsBadgeCount > 0 ? (meetingsBadgeCount > 99 ? '99+' : meetingsBadgeCount) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerShown: false,
          tabBarBadge: totalUnread > 0 ? (totalUnread > 99 ? '99+' : totalUnread) : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          headerShown: false,
          tabBarBadge: pendingRequestsCount > 0 ? (pendingRequestsCount > 99 ? '99+' : pendingRequestsCount) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
