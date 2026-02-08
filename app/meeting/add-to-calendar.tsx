/**
 * Add to Calendar Screen
 *
 * Provides an in-app options screen (back gesture supported) so users can
 * leave without adding the event, while still offering calendar integrations.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { Screen } from '@/components/Screen';
import { hybridGetMeeting } from '@/services/hybridMeetingService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

type CalendarAction = 'add' | 'modify' | 'remove';

export default function AddToCalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const meetingId = params.meetingId as string;
  const action: CalendarAction = (params.action as CalendarAction) || 'add';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToPhoneCalendar, setAddingToPhoneCalendar] = useState(false);

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

  /** Returns true if an event with the same title and start time exists in any writable calendar. */
  const isMeetingAlreadyInCalendar = async (): Promise<boolean> => {
    if (!meeting) return false;
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writableIds = calendars.filter((cal) => cal.allowsModifications).map((cal) => cal.id);
      if (writableIds.length === 0) return false;
      const startDate = meeting.time ? new Date(meeting.time) : new Date(meeting.date);
      const endDate = new Date(startDate.getTime() + (meeting.duration || 30) * 60000);
      const rangeStart = new Date(startDate.getTime() - 60 * 1000);
      const rangeEnd = new Date(endDate.getTime() + 60 * 1000);
      const events = await Calendar.getEventsAsync(writableIds, rangeStart, rangeEnd);
      const startMs = startDate.getTime();
      return events.some(
        (e) =>
          e.title === meeting.title &&
          Math.abs(new Date(e.startDate).getTime() - startMs) < 60 * 1000
      );
    } catch {
      return false;
    }
  };

  /** Opens the calendar app to the given event (or time). Returns true if opened successfully. */
  const openPhoneCalendarToEvent = async (eventId: string, eventStartMillis?: number): Promise<boolean> => {
    const idStr = String(eventId);
    let opened = false;
    if (Platform.OS === 'android') {
      try {
        const result = Calendar.openEventInCalendar(idStr);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          await (result as Promise<void>);
        }
        opened = true;
      } catch (e) {
        logger.warn('openEventInCalendar failed', { eventId: idStr, error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (!opened) {
      try {
        await Calendar.openEventInCalendarAsync({ id: idStr });
        opened = true;
      } catch (e) {
        logger.warn('openEventInCalendarAsync failed', { eventId: idStr, error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (!opened && Platform.OS === 'android' && eventStartMillis != null) {
      try {
        await Linking.openURL(`content://com.android.calendar/time/${eventStartMillis}`);
        opened = true;
      } catch (_) {
        logger.warn('Fallback calendar URI failed', { eventStartMillis });
      }
    }
    return opened;
  };

  const removeFromPhoneCalendar = async () => {
    if (!meeting) return;
    const storageKey = `meetingCalendarAdded:${meeting.id}`;
    const eventIdKey = `meetingCalendarEventId:${meeting.id}`;
    const existingEventId = await AsyncStorage.getItem(eventIdKey);
    setAddingToPhoneCalendar(true);
    try {
      if (existingEventId) {
        const hasPermission = await requestCalendarPermissions();
        if (!hasPermission) {
          setAddingToPhoneCalendar(false);
          return;
        }
        try {
          await Calendar.deleteEventAsync(existingEventId);
        } catch (e) {
          logger.warn('deleteEventAsync failed (event may already be deleted)', { eventId: existingEventId });
        }
      }
      await AsyncStorage.multiRemove([storageKey, eventIdKey]);
      setAddingToPhoneCalendar(false);
      Alert.alert('Removed', existingEventId ? 'Meeting removed from your phone calendar.' : 'Removed from app. If you had added this event on your device, delete it from your calendar app.', [{ text: 'OK', onPress: () => router.back() }]);
      logger.info('Meeting removed from calendar', { meetingId: meeting.id });
    } catch (error) {
      setAddingToPhoneCalendar(false);
      logger.error('Error removing from calendar', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to remove from calendar');
    }
  };

  const modifyPhoneCalendar = async () => {
    if (!meeting) return;
    const eventIdKey = `meetingCalendarEventId:${meeting.id}`;
    const existingEventId = await AsyncStorage.getItem(eventIdKey);
    if (!existingEventId) {
      await addToPhoneCalendar();
      return;
    }
    setAddingToPhoneCalendar(true);
    try {
      const hasPermission = await requestCalendarPermissions();
      if (!hasPermission) {
        setAddingToPhoneCalendar(false);
        return;
      }
      const startDate = meeting.time ? new Date(meeting.time) : new Date(meeting.date);
      const endDate = new Date(startDate.getTime() + (meeting.duration || 30) * 60000);
      const location = meeting.locationType === 'virtual' ? meeting.meetingLink : meeting.location;
      const details: Omit<Partial<Calendar.Event>, 'id'> = {
        title: meeting.title,
        notes: meeting.description || '',
        startDate,
        endDate,
        location: location || undefined,
        alarms: [{ relativeOffset: -15 }, { relativeOffset: -60 }],
      };
      await Calendar.updateEventAsync(existingEventId, details);
      setAddingToPhoneCalendar(false);
      const startMs = startDate.getTime();
      await openPhoneCalendarToEvent(existingEventId, startMs);
      Alert.alert('Updated', 'Calendar event updated with the new date and time.');
      logger.info('Meeting calendar event updated', { meetingId: meeting.id });
    } catch (error) {
      setAddingToPhoneCalendar(false);
      logger.error('Error updating calendar event', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to update calendar event');
    }
  };

  const addToPhoneCalendar = async () => {
    if (!meeting) return;
    const storageKey = `meetingCalendarAdded:${meeting.id}`;
    const eventIdKey = `meetingCalendarEventId:${meeting.id}`;
    const existingEventId = await AsyncStorage.getItem(eventIdKey);
    const alreadyAdded = await AsyncStorage.getItem(storageKey);

    if (alreadyAdded === 'true' && existingEventId) {
      let eventExists = false;
      try {
        await Calendar.getEventAsync(existingEventId);
        eventExists = true;
      } catch {
        // Event was deleted from calendar; clear state and allow re-add
        await AsyncStorage.multiRemove([storageKey, eventIdKey]);
      }
      if (eventExists) {
        Alert.alert('Already Added', 'This meeting is already in your calendar.');
        return;
      }
    }

    if (alreadyAdded === 'true' && !existingEventId) {
      const inCalendar = await isMeetingAlreadyInCalendar();
      if (inCalendar) {
        Alert.alert('Already Added', 'This meeting is already in your calendar.');
        return;
      }
      await AsyncStorage.removeItem(storageKey);
    }

    setAddingToPhoneCalendar(true);
    try {
      const hasPermission = await requestCalendarPermissions();
      if (!hasPermission) {
        setAddingToPhoneCalendar(false);
        return;
      }

      const alreadyInCalendar = await isMeetingAlreadyInCalendar();
      if (alreadyInCalendar) {
        setAddingToPhoneCalendar(false);
        Alert.alert('Already Added', 'This meeting is already in your calendar.');
        return;
      }

      const startDate = meeting.time ? new Date(meeting.time) : new Date(meeting.date);
      const endDate = new Date(startDate.getTime() + (meeting.duration || 30) * 60000);
      const location =
        meeting.locationType === 'virtual' ? meeting.meetingLink : meeting.location;

      const eventData: Omit<Partial<Calendar.Event>, 'id'> = {
        title: meeting.title,
        notes: meeting.description || '',
        startDate,
        endDate,
        location: location || undefined,
        alarms: [{ relativeOffset: -15 }, { relativeOffset: -60 }],
      };

      if (Platform.OS === 'android') {
        // Use system "add event" dialog so the user sees the native Save button
        const result = await Calendar.createEventInCalendarAsync(eventData);
        setAddingToPhoneCalendar(false);
        if (result.action === 'canceled' || result.action === 'deleted') {
          Alert.alert('Cancelled', 'Event was not added to your calendar.');
        } else {
          await AsyncStorage.setItem(storageKey, 'true');
          if (result.id) await AsyncStorage.setItem(eventIdKey, result.id);
          Alert.alert('Done', 'If you tapped Save, the event is now in your calendar.');
        }
        logger.info('Android add to calendar dialog closed', { meetingId: meeting.id, action: result.action });
      } else {
        const calendarId = await getDefaultCalendar();
        if (!calendarId) {
          Alert.alert('Error', 'No calendar found');
          setAddingToPhoneCalendar(false);
          return;
        }

        const eventId = await Calendar.createEventAsync(calendarId, eventData as Calendar.Event);
        await AsyncStorage.setItem(storageKey, 'true');
        await AsyncStorage.setItem(eventIdKey, eventId);
        setAddingToPhoneCalendar(false);

        const startMs = startDate.getTime();
        await openPhoneCalendarToEvent(eventId, startMs);
        Alert.alert('Success', 'Event added to your calendar!');
        logger.info('Meeting added to phone calendar', { meetingId: meeting.id });
      }
    } catch (error) {
      setAddingToPhoneCalendar(false);
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
        <Text style={styles.headerTitle}>
          {action === 'remove' ? 'Remove from Calendar' : action === 'modify' ? 'Modify Calendar' : 'Add to Calendar'}
        </Text>
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

          {action === 'remove' ? (
            <TouchableOpacity
              style={[styles.option, addingToPhoneCalendar && styles.optionDisabled]}
              onPress={removeFromPhoneCalendar}
              disabled={addingToPhoneCalendar}
              accessibilityLabel="Remove from phone calendar"
              accessibilityHint="Removes this meeting from your device calendar"
            >
              {addingToPhoneCalendar ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <Ionicons name="calendar-outline" size={20} color="#dc2626" />
              )}
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionText, styles.removeOptionText]}>
                  {addingToPhoneCalendar ? 'Removing…' : 'Remove from Phone Calendar'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.option, addingToPhoneCalendar && styles.optionDisabled]}
                onPress={action === 'modify' ? modifyPhoneCalendar : addToPhoneCalendar}
                disabled={addingToPhoneCalendar}
                accessibilityLabel={action === 'modify' ? 'Update phone calendar' : 'Add to phone calendar'}
                accessibilityHint={action === 'modify' ? 'Updates the calendar event with the new meeting time' : 'Adds this meeting to your device calendar'}
              >
                {addingToPhoneCalendar ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Ionicons name="calendar" size={20} color="#2563eb" />
                )}
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionText}>
                    {addingToPhoneCalendar ? (action === 'modify' ? 'Updating…' : 'Adding to calendar…') : action === 'modify' ? 'Update Phone Calendar' : 'Phone Calendar'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} onPress={exportToGoogleCalendar} accessibilityLabel="Add to Google Calendar">
                <Ionicons name="logo-google" size={20} color="#2563eb" />
                <Text style={styles.optionText}>Google Calendar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} onPress={exportToOutlook} accessibilityLabel="Add to Outlook Calendar">
                <Ionicons name="mail" size={20} color="#2563eb" />
                <Text style={styles.optionText}>Outlook/Hotmail</Text>
              </TouchableOpacity>
            </>
          )}

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
  optionTextWrap: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  removeOptionText: {
    color: '#dc2626',
  },
  cancel: {
    backgroundColor: '#f8fafc',
  },
  cancelText: {
    color: '#6b7280',
  },
  optionDisabled: {
    opacity: 0.7,
  },
});

