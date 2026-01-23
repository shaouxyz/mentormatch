/**
 * Upcoming Meetings Screen
 * 
 * Displays all upcoming confirmed meetings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { hybridGetUpcomingMeetings } from '@/services/hybridMeetingService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

export default function UpcomingMeetingsScreen() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      loadMeetings();
    }, [])
  );

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user');
      
      if (!userData) {
        router.replace('/login');
        return;
      }

      const user = JSON.parse(userData);
      setCurrentUserEmail(user.email);
      const upcomingMeetings = await hybridGetUpcomingMeetings(user.email);
      setMeetings(upcomingMeetings);
      logger.info('Upcoming meetings loaded', { count: upcomingMeetings.length });
    } catch (error) {
      logger.error('Error loading upcoming meetings', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to load upcoming meetings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMeetings();
  };

  const requestCalendarPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Calendar permission is required to add events to your calendar.'
        );
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Error requesting calendar permissions', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  };

  const getDefaultCalendar = async (): Promise<string | null> => {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];
      return defaultCalendar?.id || null;
    } catch (error) {
      logger.error('Error getting calendars', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  };

  const addToPhoneCalendar = async (meeting: Meeting) => {
    try {
      const hasPermission = await requestCalendarPermissions();
      if (!hasPermission) return;

      const calendarId = await getDefaultCalendar();
      if (!calendarId) {
        Alert.alert('Error', 'No calendar found');
        return;
      }

      const meetingDate = new Date(meeting.date);
      const endDate = new Date(meetingDate.getTime() + meeting.duration * 60000);

      const eventDetails: Calendar.Event = {
        title: meeting.title,
        notes: meeting.description,
        startDate: meetingDate,
        endDate: endDate,
        location: meeting.locationType === 'virtual' ? meeting.meetingLink : meeting.location,
        alarms: [
          { relativeOffset: -15 }, // 15 minutes before
          { relativeOffset: -60 }, // 1 hour before
        ],
      };

      await Calendar.createEventAsync(calendarId, eventDetails);
      Alert.alert('Success', 'Event added to your calendar!');
      logger.info('Meeting added to phone calendar', { meetingId: meeting.id });
    } catch (error) {
      logger.error('Error adding to phone calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to add event to calendar');
    }
  };

  const exportToGoogleCalendar = (meeting: Meeting) => {
    try {
      const meetingDate = new Date(meeting.date);
      const endDate = new Date(meetingDate.getTime() + meeting.duration * 60000);

      const formatDateForGoogle = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
      };

      const location = meeting.locationType === 'virtual' 
        ? meeting.meetingLink 
        : meeting.location;

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${formatDateForGoogle(meetingDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(meeting.description || '')}&location=${encodeURIComponent(location || '')}`;

      Linking.openURL(url);
      logger.info('Opening Google Calendar link', { meetingId: meeting.id });
    } catch (error) {
      logger.error('Error opening Google Calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to open Google Calendar');
    }
  };

  const exportToOutlook = (meeting: Meeting) => {
    try {
      const meetingDate = new Date(meeting.date);
      const endDate = new Date(meetingDate.getTime() + meeting.duration * 60000);

      const formatDateForOutlook = (date: Date) => {
        return date.toISOString();
      };

      const location = meeting.locationType === 'virtual' 
        ? meeting.meetingLink 
        : meeting.location;

      const url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(meeting.title)}&startdt=${formatDateForOutlook(meetingDate)}&enddt=${formatDateForOutlook(endDate)}&body=${encodeURIComponent(meeting.description || '')}&location=${encodeURIComponent(location || '')}`;

      Linking.openURL(url);
      logger.info('Opening Outlook Calendar link', { meetingId: meeting.id });
    } catch (error) {
      logger.error('Error opening Outlook Calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to open Outlook Calendar');
    }
  };

  const showCalendarOptions = (meeting: Meeting) => {
    Alert.alert(
      'Add to Calendar',
      'Choose where to add this meeting:',
      [
        {
          text: 'Phone Calendar',
          onPress: () => addToPhoneCalendar(meeting),
        },
        {
          text: 'Google Calendar',
          onPress: () => exportToGoogleCalendar(meeting),
        },
        {
          text: 'Outlook/Hotmail',
          onPress: () => exportToOutlook(meeting),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const isOrganizer = item.organizerEmail === currentUserEmail;
    const otherPerson = isOrganizer ? item.participantName : item.organizerName;

    return (
      <View style={styles.meetingCard}>
        <View style={styles.meetingHeader}>
          <Text style={styles.meetingTitle}>{item.title}</Text>
          <TouchableOpacity
            onPress={() => showCalendarOptions(item)}
            accessibilityLabel="Add to calendar"
          >
            <Ionicons name="calendar-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <View style={styles.meetingDetail}>
          <Ionicons name="person-circle" size={18} color="#6b7280" />
          <Text style={styles.detailText}>With: {otherPerson}</Text>
        </View>

        <View style={styles.meetingDetail}>
          <Ionicons name="calendar" size={18} color="#6b7280" />
          <Text style={styles.detailText}>{formatDate(item.date)}</Text>
        </View>

        <View style={styles.meetingDetail}>
          <Ionicons name="time" size={18} color="#6b7280" />
          <Text style={styles.detailText}>
            {formatTime(item.time)} ({item.duration} min)
          </Text>
        </View>

        <View style={styles.meetingDetail}>
          <Ionicons
            name={
              item.locationType === 'virtual'
                ? 'videocam'
                : item.locationType === 'phone'
                ? 'call'
                : 'location'
            }
            size={18}
            color="#6b7280"
          />
          <Text style={styles.detailText}>
            {item.locationType === 'virtual'
              ? item.meetingLink
              : item.location}
          </Text>
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No Upcoming Meetings</Text>
      <Text style={styles.emptySubtitle}>
        Schedule a meeting with your mentors or mentees
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Meetings</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={meetings}
        renderItem={renderMeeting}
        keyExtractor={(item) => item.id}
        contentContainerStyle={meetings.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  meetingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    lineHeight: 20,
  },
});
