/**
 * Meeting Response Screen
 * 
 * Allows users to accept or decline meeting requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hybridGetMeeting, hybridUpdateMeeting } from '@/services/hybridMeetingService';
import { scheduleMeetingNotifications, cancelMeetingNotifications } from '@/services/meetingNotificationService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';
import { sanitizeTextField } from '@/utils/security';
import { Screen } from '@/components/Screen';

export default function MeetingResponseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [requestCancelLoading, setRequestCancelLoading] = useState(false);
  const [agreeToCancelLoading, setAgreeToCancelLoading] = useState(false);
  const [rescheduleRequestLoading, setRescheduleRequestLoading] = useState(false);
  const [agreeToRescheduleLoading, setAgreeToRescheduleLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState(new Date());
  const [rescheduleDuration, setRescheduleDuration] = useState('60');
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);
  const [showRescheduleTimePicker, setShowRescheduleTimePicker] = useState(false);
  const [responseNote, setResponseNote] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isOrganizer, setIsOrganizer] = useState<boolean>(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [calendarEventId, setCalendarEventId] = useState<string | null>(null);

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  useFocusEffect(
    useCallback(() => {
      if (meetingId && meeting) {
        const refreshCalendarState = async () => {
          const storageKey = `meetingCalendarAdded:${meetingId}`;
          const eventIdKey = `meetingCalendarEventId:${meetingId}`;
          const added = await AsyncStorage.getItem(storageKey);
          const eventId = await AsyncStorage.getItem(eventIdKey);
          setCalendarAdded(added === 'true');
          setCalendarEventId(eventId || null);
        };
        refreshCalendarState();
      }
    }, [meetingId, meeting])
  );

  const loadMeeting = async () => {
    try {
      setLoading(true);
      
      // Get current user email
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'User not authenticated');
        router.replace('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      const userEmail = user.email;
      setCurrentUserEmail(userEmail);
      
      const meetingData = await hybridGetMeeting(meetingId);
      
      if (!meetingData) {
        Alert.alert('Error', 'Meeting not found');
        router.back();
        return;
      }

      // Check if current user is the organizer or participant
      const userIsOrganizer = meetingData.organizerEmail === userEmail;
      setIsOrganizer(userIsOrganizer);

      setMeeting(meetingData);

      const storageKey = `meetingCalendarAdded:${meetingData.id}`;
      const eventIdKey = `meetingCalendarEventId:${meetingData.id}`;
      const added = await AsyncStorage.getItem(storageKey);
      const eventId = await AsyncStorage.getItem(eventIdKey);
      setCalendarAdded(added === 'true');
      setCalendarEventId(eventId || null);
    } catch (error) {
      logger.error('Error loading meeting', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!meeting) return;
    const participantName = meeting.participantName || meeting.participantEmail || 'participant';
    Alert.alert(
      'Withdraw meeting request',
      `Cancel your meeting request to ${participantName}? They will no longer see this request.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setWithdrawing(true);
              await hybridUpdateMeeting(meetingId, { status: 'cancelled', updatedAt: new Date().toISOString() });
              try {
                await cancelMeetingNotifications(meetingId);
              } catch (e) {
                logger.warn('Failed to cancel meeting notifications', { meetingId });
              }
              Alert.alert('Done', 'Meeting request withdrawn.', [{ text: 'OK', onPress: () => router.back() }]);
              logger.info('Meeting request withdrawn', { meetingId });
            } catch (error) {
              logger.error('Error withdrawing meeting', error instanceof Error ? error : new Error(String(error)));
              Alert.alert('Error', 'Failed to withdraw meeting request. Please try again.');
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const handleResponse = async (accepted: boolean) => {
    if (!meeting) return;

    try {
      setResponding(true);

      const updateData: Partial<Meeting> = {
        status: accepted ? 'accepted' : 'declined',
        respondedAt: new Date().toISOString(),
      };
      
      // Only include responseNote if it has a value (Firestore doesn't allow undefined)
      if (responseNote && responseNote.trim()) {
        updateData.responseNote = sanitizeTextField(responseNote);
      }
      
      await hybridUpdateMeeting(meetingId, updateData);

      // Schedule notifications if accepted, cancel if declined
      if (accepted) {
        try {
          const meetingWithUpdate: Meeting = {
            ...meeting,
            ...updateData,
            status: 'accepted',
          };
          await scheduleMeetingNotifications(meetingWithUpdate);
        } catch (notificationError) {
          logger.warn('Failed to schedule notifications for accepted meeting', {
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
            meetingId,
          });
          // Don't fail the response if notifications fail
        }
      } else {
        try {
          await cancelMeetingNotifications(meetingId);
        } catch (notificationError) {
          logger.warn('Failed to cancel notifications for declined meeting', {
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
            meetingId,
          });
          // Don't fail the response if notification cancellation fails
        }
      }

      Alert.alert(
        'Success',
        accepted 
          ? 'Meeting accepted! It has been added to your calendar.'
          : 'Meeting declined.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      logger.info('Meeting response submitted', { meetingId, accepted });
    } catch (error) {
      // Enhanced error logging with Firebase error details
      const firebaseError = error as any;
      const errorMessage = firebaseError?.message || (error instanceof Error ? error.message : String(error));
      const errorCode = firebaseError?.code;
      
      logger.error('Error responding to meeting', {
        meetingId,
        accepted,
        error: errorMessage,
        errorCode,
        errorName: firebaseError?.name,
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      // Provide more specific error messages based on Firebase error codes
      let userMessage = 'Failed to respond to meeting. Please try again.';
      if (errorCode === 'permission-denied') {
        userMessage = 'You do not have permission to update this meeting. Please check your authentication.';
      } else if (errorCode === 'not-found' || errorMessage.includes('not found')) {
        userMessage = 'Meeting not found. It may have been deleted or does not exist in Firebase.';
      } else if (errorCode === 'unavailable' || errorMessage.includes('network')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', userMessage);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const openAddToCalendar = (action?: 'add' | 'modify' | 'remove') => {
    router.push({
      pathname: '/meeting/add-to-calendar',
      params: { meetingId, action: action || 'add' },
    });
  };

  const otherPartyEmail = meeting
    ? (isOrganizer ? meeting.participantEmail : meeting.organizerEmail)
    : '';
  const otherPartyName = meeting
    ? (isOrganizer ? meeting.participantName : meeting.organizerName)
    : '';
  const cancelRequesterName = !meeting
    ? 'Someone'
    : meeting.cancelRequestedBy === meeting.organizerEmail
      ? meeting.organizerName
      : meeting.cancelRequestedBy === meeting.participantEmail
        ? meeting.participantName
        : meeting.cancelRequestedBy || 'Someone';

  const handleRequestCancel = async () => {
    if (!meeting || !currentUserEmail) return;
    Alert.alert(
      'Cancel',
      `Send a cancel request to ${otherPartyName}? The meeting will be cancelled only if they agree.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Send request',
          onPress: async () => {
            try {
              setRequestCancelLoading(true);
              await hybridUpdateMeeting(meetingId, {
                cancelRequestedBy: currentUserEmail,
                updatedAt: new Date().toISOString(),
              });
              await loadMeeting();
              Alert.alert('Request sent', `Cancel request sent to ${otherPartyName}. The meeting will be cancelled when they agree.`);
            } catch (error) {
              logger.error('Error requesting meeting cancel', error instanceof Error ? error : new Error(String(error)));
              Alert.alert('Error', 'Failed to send cancel request. Please try again.');
            } finally {
              setRequestCancelLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAgreeToCancel = async () => {
    if (!meeting || !currentUserEmail) return;
    Alert.alert(
      'Agree to cancel',
      'Cancel this meeting? It will no longer appear in Upcoming for either party.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel meeting',
          style: 'destructive',
          onPress: async () => {
            try {
              setAgreeToCancelLoading(true);
              const approvedBy = [...(meeting.cancelApprovedBy || []), currentUserEmail];
              await hybridUpdateMeeting(meetingId, {
                status: 'cancelled',
                cancelApprovedBy: approvedBy,
                updatedAt: new Date().toISOString(),
              });
              try {
                await cancelMeetingNotifications(meetingId);
              } catch (e) {
                logger.warn('Failed to cancel meeting notifications', { meetingId });
              }
              await loadMeeting();
              Alert.alert('Meeting cancelled', 'This meeting has been cancelled.', [{ text: 'OK', onPress: () => router.back() }]);
            } catch (error) {
              logger.error('Error agreeing to cancel meeting', error instanceof Error ? error : new Error(String(error)));
              Alert.alert('Error', 'Failed to cancel meeting. Please try again.');
            } finally {
              setAgreeToCancelLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclineCancelRequest = async () => {
    if (!meeting) return;
    try {
      setAgreeToCancelLoading(true);
      await hybridUpdateMeeting(meetingId, {
        cancelRequestedBy: null,
        cancelApprovedBy: null,
        updatedAt: new Date().toISOString(),
      });
      await loadMeeting();
      Alert.alert('Request declined', 'The cancel request was declined. The meeting is still scheduled.');
    } catch (error) {
      logger.error('Error declining cancel request', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to decline. Please try again.');
    } finally {
      setAgreeToCancelLoading(false);
    }
  };

  const openRescheduleModal = () => {
    if (!meeting) return;
    const currentDate = new Date(meeting.time || meeting.date);
    setRescheduleDate(currentDate);
    setRescheduleTime(currentDate);
    setRescheduleDuration(String(meeting.duration || 60));
    setShowRescheduleModal(true);
    setShowRescheduleDatePicker(Platform.OS === 'ios');
    setShowRescheduleTimePicker(false);
  };

  const handleSendRescheduleRequest = async () => {
    if (!meeting || !currentUserEmail) return;
    const durationNum = parseInt(rescheduleDuration, 10);
    if (isNaN(durationNum) || durationNum < 1) {
      Alert.alert('Error', 'Please enter a valid duration (minutes).');
      return;
    }
    const combined = new Date(
      rescheduleDate.getFullYear(),
      rescheduleDate.getMonth(),
      rescheduleDate.getDate(),
      rescheduleTime.getHours(),
      rescheduleTime.getMinutes()
    );
    try {
      setRescheduleRequestLoading(true);
      setShowRescheduleModal(false);
      await hybridUpdateMeeting(meetingId, {
        rescheduleRequestedBy: currentUserEmail,
        rescheduleProposedDate: combined.toISOString(),
        rescheduleProposedTime: combined.toISOString(),
        rescheduleProposedDuration: durationNum,
        updatedAt: new Date().toISOString(),
      });
      await loadMeeting();
      Alert.alert('Request sent', `Reschedule request sent to ${otherPartyName}. The meeting will be updated when they agree.`);
    } catch (error) {
      logger.error('Error sending reschedule request', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to send reschedule request. Please try again.');
    } finally {
      setRescheduleRequestLoading(false);
    }
  };

  const handleAgreeToReschedule = async () => {
    if (!meeting || !meeting.rescheduleProposedDate || !meeting.rescheduleProposedTime) return;
    Alert.alert(
      'Agree to reschedule',
      'Update this meeting to the proposed date and time?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, reschedule',
          onPress: async () => {
            try {
              setAgreeToRescheduleLoading(true);
              const newDate = new Date(meeting.rescheduleProposedDate!);
              const newTime = new Date(meeting.rescheduleProposedTime!);
              const duration = meeting.rescheduleProposedDuration ?? meeting.duration ?? 60;
              await hybridUpdateMeeting(meetingId, {
                date: newDate.toISOString(),
                time: newTime.toISOString(),
                duration,
                rescheduleRequestedBy: null,
                rescheduleProposedDate: null,
                rescheduleProposedTime: null,
                rescheduleProposedDuration: null,
                updatedAt: new Date().toISOString(),
              });
              try {
                await cancelMeetingNotifications(meetingId);
                const updatedMeeting: Meeting = {
                  ...meeting,
                  date: newDate.toISOString(),
                  time: newTime.toISOString(),
                  duration,
                };
                await scheduleMeetingNotifications(updatedMeeting);
              } catch (e) {
                logger.warn('Failed to update meeting notifications', { meetingId });
              }
              await loadMeeting();
              Alert.alert('Meeting rescheduled', 'The meeting has been updated to the new date and time.', [{ text: 'OK' }]);
            } catch (error) {
              logger.error('Error agreeing to reschedule', error instanceof Error ? error : new Error(String(error)));
              Alert.alert('Error', 'Failed to reschedule. Please try again.');
            } finally {
              setAgreeToRescheduleLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclineRescheduleRequest = async () => {
    if (!meeting) return;
    try {
      setAgreeToRescheduleLoading(true);
      await hybridUpdateMeeting(meetingId, {
        rescheduleRequestedBy: null,
        rescheduleProposedDate: null,
        rescheduleProposedTime: null,
        rescheduleProposedDuration: null,
        updatedAt: new Date().toISOString(),
      });
      await loadMeeting();
      Alert.alert('Request declined', 'The reschedule request was declined. The meeting stays at the original time.');
    } catch (error) {
      logger.error('Error declining reschedule request', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to decline. Please try again.');
    } finally {
      setAgreeToRescheduleLoading(false);
    }
  };

  const rescheduleRequesterName = !meeting
    ? 'Someone'
    : meeting.rescheduleRequestedBy === meeting.organizerEmail
      ? meeting.organizerName
      : meeting.rescheduleRequestedBy === meeting.participantEmail
        ? meeting.participantName
        : meeting.rescheduleRequestedBy || 'Someone';

  if (loading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading meeting details...</Text>
      </Screen>
    );
  }

  if (!meeting) {
    return (
      <Screen style={styles.container}>
        <Text>Meeting not found</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Request</Text>
        <TouchableOpacity
          onPress={() => openAddToCalendar(meeting.status === 'cancelled' && calendarAdded ? 'remove' : meeting.status === 'accepted' && calendarAdded && calendarEventId ? 'modify' : 'add')}
          accessibilityLabel={meeting.status === 'cancelled' && calendarAdded ? 'Remove from calendar' : meeting.status === 'accepted' && calendarAdded && calendarEventId ? 'Modify calendar' : 'Add to calendar'}
          accessibilityHint="Tap to open calendar options"
        >
          <Ionicons name="calendar-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.meetingCard}>
          <Text style={styles.meetingTitle}>{meeting.title}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-circle" size={24} color="#2563eb" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Organized by</Text>
              <Text style={styles.detailValue}>{meeting.organizerName}</Text>
              <Text style={styles.detailSubValue}>{meeting.organizerEmail}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people" size={24} color="#2563eb" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Participant</Text>
              <Text style={styles.detailValue}>{meeting.participantName}</Text>
              <Text style={styles.detailSubValue}>{meeting.participantEmail}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={24} color="#2563eb" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(meeting.date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time" size={24} color="#2563eb" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(meeting.time)} ({meeting.duration} minutes)
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons 
              name={
                meeting.locationType === 'virtual' 
                  ? 'videocam' 
                  : meeting.locationType === 'phone' 
                    ? 'call' 
                    : 'location'
              } 
              size={24} 
              color="#2563eb" 
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                {meeting.locationType === 'virtual' 
                  ? 'Virtual Meeting' 
                  : meeting.locationType === 'phone' 
                    ? 'Phone Call' 
                    : 'In-Person Meeting'}
              </Text>
              <Text style={styles.detailValue}>
                {meeting.locationType === 'virtual' 
                  ? meeting.meetingLink 
                  : meeting.location}
              </Text>
            </View>
          </View>

          {meeting.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.descriptionText}>{meeting.description}</Text>
            </View>
          )}

          {/* Add / Modify / Remove from Calendar */}
          {meeting.status === 'cancelled' && calendarAdded ? (
            <TouchableOpacity
              style={styles.removeFromCalendarButton}
              onPress={() => openAddToCalendar('remove')}
              accessibilityLabel="Remove from calendar"
              accessibilityHint="Remove this meeting from your phone calendar"
            >
              <Ionicons name="calendar-outline" size={20} color="#dc2626" />
              <Text style={styles.removeFromCalendarButtonText}>Remove from Calendar</Text>
            </TouchableOpacity>
          ) : meeting.status === 'accepted' && calendarAdded && calendarEventId ? (
            <TouchableOpacity
              style={styles.addToCalendarButton}
              onPress={() => openAddToCalendar('modify')}
              accessibilityLabel="Modify calendar"
              accessibilityHint="Update the calendar event with the current meeting time"
            >
              <Ionicons name="calendar" size={20} color="#0d9488" />
              <Text style={styles.addToCalendarButtonText}>Modify Calendar</Text>
            </TouchableOpacity>
          ) : meeting.status !== 'cancelled' ? (
            <TouchableOpacity
              style={styles.addToCalendarButton}
              onPress={() => openAddToCalendar('add')}
              accessibilityLabel="Add to calendar"
              accessibilityHint="Tap to add this meeting to your phone calendar, Google Calendar, or Outlook"
            >
              <Ionicons name="calendar" size={20} color="#0d9488" />
              <Text style={styles.addToCalendarButtonText}>Add to Calendar</Text>
            </TouchableOpacity>
          ) : null}

          {/* Reschedule (accepted meetings only) */}
          {meeting.status === 'accepted' && (
            <View style={styles.rescheduleSection}>
              {!meeting.rescheduleRequestedBy && (
                <TouchableOpacity
                  style={styles.rescheduleButton}
                  onPress={openRescheduleModal}
                  disabled={rescheduleRequestLoading}
                  accessibilityLabel="Reschedule meeting"
                  accessibilityHint="Propose a new date and time. The other party must agree."
                >
                  {rescheduleRequestLoading ? (
                    <ActivityIndicator size="small" color="#0d9488" />
                  ) : (
                    <Ionicons name="calendar-outline" size={20} color="#0d9488" />
                  )}
                  <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                </TouchableOpacity>
              )}
              {meeting.rescheduleRequestedBy === currentUserEmail && meeting.rescheduleProposedDate && meeting.rescheduleProposedTime && (
                <View style={styles.rescheduleMessage}>
                  <Ionicons name="time" size={20} color="#64748b" />
                  <Text style={styles.rescheduleMessageText}>
                    Reschedule request sent. Proposed: {formatDate(meeting.rescheduleProposedDate)} at {formatTime(meeting.rescheduleProposedTime)}
                    {meeting.rescheduleProposedDuration ? ` (${meeting.rescheduleProposedDuration} min)` : ''}. Waiting for {otherPartyName} to agree.
                  </Text>
                </View>
              )}
              {meeting.rescheduleRequestedBy && meeting.rescheduleRequestedBy !== currentUserEmail && meeting.rescheduleProposedDate && meeting.rescheduleProposedTime && (
                <View style={styles.rescheduleActions}>
                  <Text style={styles.rescheduleLabel}>
                    {rescheduleRequesterName} requested to reschedule to {formatDate(meeting.rescheduleProposedDate)} at {formatTime(meeting.rescheduleProposedTime)}
                    {meeting.rescheduleProposedDuration ? ` (${meeting.rescheduleProposedDuration} min)` : ''}
                  </Text>
                  <View style={styles.rescheduleButtonRow}>
                    <TouchableOpacity
                      style={styles.agreeToRescheduleButton}
                      onPress={handleAgreeToReschedule}
                      disabled={agreeToRescheduleLoading}
                      accessibilityLabel="Agree to reschedule meeting"
                    >
                      {agreeToRescheduleLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.agreeToRescheduleButtonText}>Agree to reschedule</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineRescheduleButton}
                      onPress={handleDeclineRescheduleRequest}
                      disabled={agreeToRescheduleLoading}
                      accessibilityLabel="Decline reschedule request"
                    >
                      <Text style={styles.declineRescheduleButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Request to cancel (accepted meetings only) */}
          {meeting.status === 'accepted' && (
            <View style={styles.cancelRequestSection}>
              {!meeting.cancelRequestedBy && (
                <TouchableOpacity
                  style={styles.requestCancelButton}
                  onPress={handleRequestCancel}
                  disabled={requestCancelLoading}
                  accessibilityLabel="Cancel meeting"
                  accessibilityHint="Send a cancel request to the other party. Meeting is cancelled only if they agree."
                >
                  {requestCancelLoading ? (
                    <ActivityIndicator size="small" color="#b45309" />
                  ) : (
                    <Ionicons name="close-circle-outline" size={20} color="#b45309" />
                  )}
                  <Text style={styles.requestCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {meeting.cancelRequestedBy === currentUserEmail && (
                <View style={styles.cancelRequestMessage}>
                  <Ionicons name="time" size={20} color="#64748b" />
                  <Text style={styles.cancelRequestMessageText}>
                    Cancel request sent. Waiting for {otherPartyName} to agree.
                  </Text>
                </View>
              )}
              {meeting.cancelRequestedBy && meeting.cancelRequestedBy !== currentUserEmail && (
                <View style={styles.cancelRequestActions}>
                  <Text style={styles.cancelRequestLabel}>
                    {cancelRequesterName} requested to cancel this meeting
                  </Text>
                  <View style={styles.cancelRequestButtonRow}>
                    <TouchableOpacity
                      style={styles.agreeToCancelButton}
                      onPress={handleAgreeToCancel}
                      disabled={agreeToCancelLoading}
                      accessibilityLabel="Agree to cancel meeting"
                    >
                      {agreeToCancelLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.agreeToCancelButtonText}>Agree to cancel</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineCancelRequestButton}
                      onPress={handleDeclineCancelRequest}
                      disabled={agreeToCancelLoading}
                      accessibilityLabel="Decline cancel request"
                    >
                      <Text style={styles.declineCancelRequestButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {isOrganizer ? (
          // Organizer view: Show status and withdraw when pending
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Meeting Status</Text>
            <View style={styles.statusContent}>
              {meeting.status === 'pending' && (
                <>
                  <View style={[styles.statusBadge, styles.statusBadgePending]}>
                    <Ionicons name="time" size={20} color="#f59e0b" />
                    <Text style={styles.statusTextPending}>Pending Response</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.withdrawButton}
                    onPress={handleWithdraw}
                    disabled={withdrawing}
                    accessibilityLabel="Withdraw meeting request"
                    accessibilityHint="Cancel this meeting request"
                  >
                    {withdrawing ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <Ionicons name="close-circle-outline" size={20} color="#dc2626" />
                    )}
                    <Text style={styles.withdrawButtonText}>Withdraw request</Text>
                  </TouchableOpacity>
                </>
              )}
              {meeting.status === 'accepted' && (
                <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.statusTextAccepted}>Accepted</Text>
                </View>
              )}
              {meeting.status === 'declined' && (
                <View style={[styles.statusBadge, styles.statusBadgeDeclined]}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                  <Text style={styles.statusTextDeclined}>Declined</Text>
                </View>
              )}
              {meeting.status === 'cancelled' && (
                <View style={[styles.statusBadge, styles.statusBadgeCancelled]}>
                  <Ionicons name="ban" size={20} color="#6b7280" />
                  <Text style={styles.statusTextCancelled}>Cancelled</Text>
                </View>
              )}
              
              {meeting.respondedAt && (
                <Text style={styles.respondedAtText}>
                  Responded: {formatDate(meeting.respondedAt)} at {formatTime(meeting.respondedAt)}
                </Text>
              )}
              
              {meeting.responseNote && (
                <View style={styles.responseNoteContainer}>
                  <Text style={styles.responseNoteLabel}>Response Note:</Text>
                  <Text style={styles.responseNoteText}>{meeting.responseNote}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // Participant view: Show accept/decline buttons (if pending)
          <>
            {meeting.status === 'pending' ? (
              <>
                <View style={styles.responseCard}>
                  <Text style={styles.responseTitle}>Your Response</Text>
                  <TextInput
                    style={styles.responseInput}
                    placeholder="Add a note (optional)"
                    value={responseNote}
                    onChangeText={(text) => setResponseNote(sanitizeTextField(text))}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    accessibilityLabel="Response note input"
                  />
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleResponse(true)}
                    disabled={responding}
                    accessibilityLabel="Accept meeting"
                  >
                    {responding ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleResponse(false)}
                    disabled={responding}
                    accessibilityLabel="Decline meeting"
                  >
                    {responding ? (
                      <ActivityIndicator color="#dc2626" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#dc2626" />
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Participant already responded - show status
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Your Response</Text>
                <View style={styles.statusContent}>
                  {meeting.status === 'accepted' && (
                    <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      <Text style={styles.statusTextAccepted}>You Accepted</Text>
                    </View>
                  )}
                  {meeting.status === 'declined' && (
                    <View style={[styles.statusBadge, styles.statusBadgeDeclined]}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                      <Text style={styles.statusTextDeclined}>You Declined</Text>
                    </View>
                  )}
                  
                  {meeting.respondedAt && (
                    <Text style={styles.respondedAtText}>
                      Responded: {formatDate(meeting.respondedAt)} at {formatTime(meeting.respondedAt)}
                    </Text>
                  )}
                  
                  {meeting.responseNote && (
                    <View style={styles.responseNoteContainer}>
                      <Text style={styles.responseNoteLabel}>Your Note:</Text>
                      <Text style={styles.responseNoteText}>{meeting.responseNote}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </View>
      </ScrollView>

      {/* Reschedule proposal modal */}
      <Modal
        visible={showRescheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rescheduleModalContent}>
            <Text style={styles.rescheduleModalTitle}>Propose new date and time</Text>

            <View style={styles.rescheduleModalRow}>
              <Text style={styles.rescheduleModalLabel}>Date</Text>
              <TouchableOpacity
                style={styles.rescheduleModalButton}
                onPress={() => { setShowRescheduleDatePicker(true); setShowRescheduleTimePicker(false); }}
              >
                <Text style={styles.rescheduleModalButtonText}>
                  {rescheduleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showRescheduleDatePicker && (
                <DateTimePicker
                  value={rescheduleDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (d) setRescheduleDate(d);
                    if (Platform.OS !== 'ios') setShowRescheduleDatePicker(false);
                  }}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.rescheduleModalRow}>
              <Text style={styles.rescheduleModalLabel}>Time</Text>
              <TouchableOpacity
                style={styles.rescheduleModalButton}
                onPress={() => { setShowRescheduleTimePicker(true); setShowRescheduleDatePicker(false); }}
              >
                <Text style={styles.rescheduleModalButtonText}>
                  {rescheduleTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showRescheduleTimePicker && (
                <DateTimePicker
                  value={rescheduleTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, t) => {
                    if (t) setRescheduleTime(t);
                    if (Platform.OS !== 'ios') setShowRescheduleTimePicker(false);
                  }}
                />
              )}
            </View>

            <View style={styles.rescheduleModalRow}>
              <Text style={styles.rescheduleModalLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.rescheduleDurationInput}
                value={rescheduleDuration}
                onChangeText={setRescheduleDuration}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            <View style={styles.rescheduleModalActions}>
              <TouchableOpacity
                style={styles.rescheduleModalCancelButton}
                onPress={() => setShowRescheduleModal(false)}
              >
                <Text style={styles.rescheduleModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescheduleModalSendButton}
                onPress={handleSendRescheduleRequest}
                disabled={rescheduleRequestLoading}
              >
                <Text style={styles.rescheduleModalSendText}>Send request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  content: {
    padding: 16,
    paddingTop: 20, // Add space at the top
  },
  meetingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  meetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  descriptionContainer: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginTop: 8,
  },
  addToCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#0d9488',
    gap: 8,
  },
  addToCalendarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d9488',
  },
  removeFromCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#dc2626',
    gap: 8,
  },
  removeFromCalendarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  responseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  responseInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc2626',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    gap: 8,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  statusTextAccepted: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  statusTextDeclined: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  statusTextCancelled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  respondedAtText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  responseNoteContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  responseNoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  responseNoteText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  rescheduleSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  rescheduleMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  rescheduleMessageText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  rescheduleActions: {
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rescheduleLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  rescheduleButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  agreeToRescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d9488',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  agreeToRescheduleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  declineRescheduleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
  },
  declineRescheduleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  rescheduleModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  rescheduleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  rescheduleModalRow: {
    marginBottom: 16,
  },
  rescheduleModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  rescheduleModalButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rescheduleModalButtonText: {
    fontSize: 16,
    color: '#1e293b',
  },
  rescheduleDurationInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rescheduleModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  rescheduleModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  rescheduleModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  rescheduleModalSendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0d9488',
  },
  rescheduleModalSendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelRequestSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  requestCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#b45309',
    gap: 8,
  },
  requestCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b45309',
  },
  cancelRequestMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cancelRequestMessageText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  cancelRequestActions: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelRequestLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  cancelRequestButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  agreeToCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b45309',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  agreeToCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  declineCancelRequestButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
  },
  declineCancelRequestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
});
