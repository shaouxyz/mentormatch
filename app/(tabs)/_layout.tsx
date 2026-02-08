import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { hybridGetUserConversations } from '@/services/hybridMessageService';
import { getTotalUnread } from '@/utils/unreadMessages';
import { logger } from '@/utils/logger';

/**
 * Tabs Layout Component
 *
 * Defines the bottom tab navigation structure with:
 * - Discover tab (home)
 * - Mentorship tab
 * - Meetings tab
 * - Messages tab (with unread badge)
 * - Requests tab
 * - Profile tab
 *
 * Loads unread count when tabs are focused so the Messages badge shows even before opening the Messages tab.
 */
export default function TabsLayout() {
  const { totalUnread, setTotalUnread } = useUnreadMessages();

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
          const conversations = await hybridGetUserConversations(email);
          if (cancelled) return;
          const total = getTotalUnread(conversations, email);
          setTotalUnread(total);
          logger.info('Unread count refreshed for tab badge', { total });
        } catch (e) {
          if (!cancelled) logger.warn('Failed to load unread count for badge', { error: e instanceof Error ? e.message : String(e) });
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
