/**
 * Add to Calendar Screen
 *
 * Provides an in-app options screen (back gesture supported) so users can
 * leave without adding the event, while still offering calendar integrations.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { Screen } from '@/components/Screen';
import { hybridGetMeeting } from '@/services/hybridMeetingService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

export default function AddToCalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const m = await hybridGetMeeting(meetingId);
      setMeeting(m);
    } catch (error) {
      logger.error('Failed to load meeting for add-to-calendar', error instanceof Error ? error : new Error(String(error)));
      setMeeting(null);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    load();
  }, [load]);

  const requestCalendarPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Calendar permission is required to add events to your calendar.');
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
      const defaultCalendar = calendars.find((cal) => cal.allowsModifications) || calendars[0];
      return defaultCalendar?.id || null;
    } catch (error) {
      logger.error('Error getting calendars', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  };

  const addToPhoneCalendar = async () => {
    if (!meeting) return;
    try {
      const hasPermission = await requestCalendarPermissions();
      if (!hasPermission) return;

      const calendarId = await getDefaultCalendar();
      if (!calendarId) {
        Alert.alert('Error', 'No calendar found');
        return;
      }

      const meetingDate = new Date(meeting.date);
      const endDate = new Date(meetingDate.getTime() + (meeting.duration || 30) * 60000);
      const location =
        meeting.locationType === 'virtual' ? meeting.meetingLink : meeting.location;

      const eventDetails: Calendar.Event = {
        title: meeting.title,
        notes: meeting.description || '',
        startDate: meetingDate,
        endDate,
        location: location || undefined,
        alarms: [{ relativeOffset: -15 }, { relativeOffset: -60 }],
      };

      await Calendar.createEventAsync(calendarId, eventDetails);
      Alert.alert('Success', 'Event added to your calendar!');
      logger.info('Meeting added to phone calendar', { meetingId: meeting.id });
    } catch (error) {
      logger.error('Error adding to phone calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to add event to calendar');
    }
  };

  const exportToGoogleCalendar = () => {
    if (!meeting) return;
    try {
      const meetingDate = new Date(meeting.date);
      const endDate = new Date(meetingDate.getTime() + (meeting.duration || 30) * 60000);

      const formatDateForGoogle = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
      const location = meeting.locationType === 'virtual' ? meeting.meetingLink : meeting.location;

      const url =
        `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(meeting.title)}` +
        `&dates=${formatDateForGoogle(meetingDate)}/${formatDateForGoogle(endDate)}` +
        `&details=${encodeURIComponent(meeting.description || '')}` +
        `&location=${encodeURIComponent(location || '')}`;

      Linking.openURL(url);
      logger.info('Opening Google Calendar link', { meetingId: meeting.id });
    } catch (error) {
      logger.error('Error opening Google Calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to open Google Calendar');
    }
  };

  const exportToOutlook = () => {
    if (!meeting) return;
    try {
      const meetingDate = new Date(meeting.date);
      const endDate = new Date(meetingDate.getTime() + (meeting.duration || 30) * 60000);
      const location = meeting.locationType === 'virtual' ? meeting.meetingLink : meeting.location;

      const url =
        `https://outlook.office.com/calendar/0/deeplink/compose` +
        `?subject=${encodeURIComponent(meeting.title)}` +
        `&startdt=${encodeURIComponent(meetingDate.toISOString())}` +
        `&enddt=${encodeURIComponent(endDate.toISOString())}` +
        `&body=${encodeURIComponent(meeting.description || '')}` +
        `&location=${encodeURIComponent(location || '')}`;

      Linking.openURL(url);
      logger.info('Opening Outlook Calendar link', { meetingId: meeting.id });
    } catch (error) {
      logger.error('Error opening Outlook Calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to open Outlook/Hotmail calendar');
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : !meeting ? (
        <View style={styles.loading}>
          <Text style={styles.errorText}>Meeting not found.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>{meeting.title}</Text>
            <Text style={styles.subtitle}>
              {new Date(meeting.date).toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity style={styles.option} onPress={addToPhoneCalendar} accessibilityLabel="Add to phone calendar">
            <Ionicons name="calendar" size={20} color="#2563eb" />
            <Text style={styles.optionText}>Phone Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={exportToGoogleCalendar} accessibilityLabel="Add to Google Calendar">
            <Ionicons name="logo-google" size={20} color="#2563eb" />
            <Text style={styles.optionText}>Google Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={exportToOutlook} accessibilityLabel="Add to Outlook Calendar">
            <Ionicons name="mail" size={20} color="#2563eb" />
            <Text style={styles.optionText}>Outlook/Hotmail</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.option, styles.cancel]} onPress={() => router.back()} accessibilityLabel="Cancel">
            <Ionicons name="close" size={20} color="#6b7280" />
            <Text style={[styles.optionText, styles.cancelText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </Screen>
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
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  errorText: {
    color: '#6b7280',
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    color: '#6b7280',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  cancel: {
    backgroundColor: '#f8fafc',
  },
  cancelText: {
    color: '#6b7280',
  },
});

