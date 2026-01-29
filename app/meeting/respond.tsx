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
import { hybridGetMeeting, hybridUpdateMeeting } from '@/services/hybridMeetingService';
import { scheduleMeetingNotifications, cancelMeetingNotifications } from '@/services/meetingNotificationService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';
import { sanitizeTextField } from '@/utils/security';

export default function MeetingResponseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [responseNote, setResponseNote] = useState('');

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      const meetingData = await hybridGetMeeting(meetingId);
      
      if (!meetingData) {
        Alert.alert('Error', 'Meeting not found');
        router.back();
        return;
      }

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

      const updateData = {
        status: accepted ? 'accepted' : 'declined',
        responseNote: responseNote ? sanitizeTextField(responseNote) : undefined,
        respondedAt: new Date().toISOString(),
      };
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
      logger.error('Error responding to meeting', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to respond to meeting. Please try again.');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading meeting details...</Text>
      </View>
    );
  }

  if (!meeting) {
    return (
      <View style={styles.container}>
        <Text>Meeting not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Request</Text>
        <View style={{ width: 24 }} />
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
        </View>

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
      </View>
    </ScrollView>
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
  content: {
    padding: 16,
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
});
