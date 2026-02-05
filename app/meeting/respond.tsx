/**
 * Meeting Response Screen
 * 
 * Allows users to accept or decline meeting requests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const [responseNote, setResponseNote] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isOrganizer, setIsOrganizer] = useState<boolean>(false);

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

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
    } catch (error) {
      logger.error('Error loading meeting', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
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

  const openAddToCalendar = () => {
    router.push({
      pathname: '/meeting/add-to-calendar',
      params: { meetingId },
    });
  };

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
          onPress={openAddToCalendar}
          accessibilityLabel="Add to calendar"
          accessibilityHint="Tap to add this meeting to your calendar"
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

          {/* Add to Calendar Button */}
          <TouchableOpacity
            style={styles.addToCalendarButton}
            onPress={openAddToCalendar}
            accessibilityLabel="Add to calendar"
            accessibilityHint="Tap to add this meeting to your phone calendar, Google Calendar, or Outlook"
          >
            <Ionicons name="calendar" size={20} color="#2563eb" />
            <Text style={styles.addToCalendarButtonText}>Add to Calendar</Text>
          </TouchableOpacity>
        </View>

        {isOrganizer ? (
          // Organizer view: Show status only
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Meeting Status</Text>
            <View style={styles.statusContent}>
              {meeting.status === 'pending' && (
                <View style={[styles.statusBadge, styles.statusBadgePending]}>
                  <Ionicons name="time" size={20} color="#f59e0b" />
                  <Text style={styles.statusTextPending}>Pending Response</Text>
                </View>
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
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
  },
  addToCalendarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
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
});
