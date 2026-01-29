/**
 * Meeting Schedule Screen
 * 
 * Allows users to schedule meetings with mentors/mentees
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hybridCreateMeeting } from '@/services/hybridMeetingService';
import { scheduleMeetingNotifications } from '@/services/meetingNotificationService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';
import { sanitizeTextField } from '@/utils/security';

export default function ScheduleMeetingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const participantEmail = params.participantEmail as string;
  const participantName = params.participantName as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'in-person' | 'virtual' | 'phone'>('virtual');
  const [meetingLink, setMeetingLink] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    if (!location.trim() && locationType === 'in-person') {
      Alert.alert('Error', 'Please enter a location for in-person meetings');
      return;
    }

    if (!meetingLink.trim() && locationType === 'virtual') {
      Alert.alert('Error', 'Please enter a meeting link for virtual meetings');
      return;
    }

    try {
      setLoading(true);
      const userEmail = await AsyncStorage.getItem('user');
      const profileData = await AsyncStorage.getItem('profile');
      
      if (!userEmail || !profileData) {
        Alert.alert('Error', 'User not authenticated');
        router.replace('/login');
        return;
      }

      const user = JSON.parse(userEmail);
      const profile = JSON.parse(profileData);

      // Combine date and time
      const meetingDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      );

      const meeting: Omit<Meeting, 'id'> = {
        organizerEmail: user.email,
        organizerName: profile.name,
        participantEmail,
        participantName,
        title: sanitizeTextField(title),
        description: description ? sanitizeTextField(description) : undefined,
        date: meetingDateTime.toISOString(),
        time: meetingDateTime.toISOString(),
        duration: parseInt(duration, 10),
        location: locationType === 'in-person' ? sanitizeTextField(location) : (locationType === 'phone' ? sanitizeTextField(location) : ''),
        locationType,
        meetingLink: locationType === 'virtual' ? sanitizeTextField(meetingLink) : undefined,
      };

      logger.info('Creating meeting request', { 
        organizerEmail: user.email, 
        participantEmail,
        title: meeting.title,
        locationType 
      });

      const createdMeeting = await hybridCreateMeeting(meeting);
      
      logger.info('Meeting request created successfully', { 
        meetingId: createdMeeting.id,
        organizerEmail: user.email,
        participantEmail 
      });

      // Schedule notifications if meeting is already accepted (shouldn't happen for new meetings, but handle it)
      if (createdMeeting.status === 'accepted') {
        try {
          await scheduleMeetingNotifications(createdMeeting);
        } catch (notificationError) {
          logger.warn('Failed to schedule notifications for meeting', {
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
            meetingId: createdMeeting.id,
          });
          // Don't fail the meeting creation if notifications fail
        }
      }

      Alert.alert(
        'Success',
        `Meeting request sent to ${participantName}. You'll be notified when they respond.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      logger.info('Meeting scheduled successfully', { participantEmail });
    } catch (error) {
      logger.error('Error scheduling meeting', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Meeting</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.participantCard}>
        <Ionicons name="person-circle" size={48} color="#2563eb" />
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{participantName}</Text>
          <Text style={styles.participantEmail}>{participantEmail}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Meeting Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Introduction Call"
            value={title}
            onChangeText={(text) => setTitle(sanitizeTextField(text))}
            maxLength={100}
            accessibilityLabel="Meeting title input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Meeting agenda or notes"
            value={description}
            onChangeText={(text) => setDescription(sanitizeTextField(text))}
            multiline
            numberOfLines={4}
            maxLength={500}
            accessibilityLabel="Description input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Select date"
          >
            <Ionicons name="calendar" size={20} color="#2563eb" />
            <Text style={styles.dateTimeText}>
              {date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
            accessibilityLabel="Select time"
          >
            <Ionicons name="time" size={20} color="#2563eb" />
            <Text style={styles.dateTimeText}>
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Duration (minutes) *</Text>
          <TextInput
            style={styles.input}
            placeholder="60"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="Duration input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Meeting Type *</Text>
          <View style={styles.locationTypeContainer}>
            <TouchableOpacity
              style={[
                styles.locationTypeButton,
                locationType === 'virtual' && styles.locationTypeButtonActive,
              ]}
              onPress={() => setLocationType('virtual')}
              accessibilityLabel="Virtual meeting"
            >
              <Ionicons 
                name="videocam" 
                size={20} 
                color={locationType === 'virtual' ? '#fff' : '#2563eb'} 
              />
              <Text 
                style={[
                  styles.locationTypeText,
                  locationType === 'virtual' && styles.locationTypeTextActive,
                ]}
              >
                Virtual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locationTypeButton,
                locationType === 'in-person' && styles.locationTypeButtonActive,
              ]}
              onPress={() => setLocationType('in-person')}
              accessibilityLabel="In-person meeting"
            >
              <Ionicons 
                name="location" 
                size={20} 
                color={locationType === 'in-person' ? '#fff' : '#2563eb'} 
              />
              <Text 
                style={[
                  styles.locationTypeText,
                  locationType === 'in-person' && styles.locationTypeTextActive,
                ]}
              >
                In-Person
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locationTypeButton,
                locationType === 'phone' && styles.locationTypeButtonActive,
              ]}
              onPress={() => setLocationType('phone')}
              accessibilityLabel="Phone call"
            >
              <Ionicons 
                name="call" 
                size={20} 
                color={locationType === 'phone' ? '#fff' : '#2563eb'} 
              />
              <Text 
                style={[
                  styles.locationTypeText,
                  locationType === 'phone' && styles.locationTypeTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {locationType === 'virtual' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Meeting Link *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., https://zoom.us/j/..."
              value={meetingLink}
              onChangeText={(text) => setMeetingLink(sanitizeTextField(text))}
              autoCapitalize="none"
              keyboardType="url"
              maxLength={200}
              accessibilityLabel="Meeting link input"
            />
          </View>
        )}

        {locationType === 'in-person' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Coffee Shop, 123 Main St"
              value={location}
              onChangeText={(text) => setLocation(sanitizeTextField(text))}
              maxLength={200}
              accessibilityLabel="Location input"
            />
          </View>
        )}

        {locationType === 'phone' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional: Your phone number"
              value={location}
              onChangeText={(text) => setLocation(sanitizeTextField(text))}
              keyboardType="phone-pad"
              maxLength={20}
              accessibilityLabel="Phone number input"
            />
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.scheduleButton}
          onPress={handleSchedule}
          disabled={loading}
          accessibilityLabel="Send meeting request"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={styles.scheduleButtonText}>Send Meeting Request</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  participantEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  form: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  locationTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    gap: 6,
  },
  locationTypeButtonActive: {
    backgroundColor: '#2563eb',
  },
  locationTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  locationTypeTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
