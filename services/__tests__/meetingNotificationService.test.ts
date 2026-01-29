/**
 * Tests for Meeting Notification Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  scheduleMeetingNotifications,
  cancelMeetingNotifications,
  scheduleNotificationsForMeetings,
  cleanupPastMeetingNotifications,
} from '../meetingNotificationService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Meeting Notification Service', () => {
  const mockMeeting: Meeting = {
    id: 'meeting123',
    organizerEmail: 'organizer@example.com',
    organizerName: 'Organizer User',
    participantEmail: 'participant@example.com',
    participantName: 'Participant User',
    title: 'Test Meeting',
    description: 'Test Description',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    duration: 60,
    location: 'Test Location',
    locationType: 'in-person',
    status: 'accepted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    // Mock notification permissions
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as any);

    // Mock notification scheduling
    mockNotifications.scheduleNotificationAsync.mockImplementation(async (options: any) => {
      return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });

    // Mock notification cancellation
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('scheduleMeetingNotifications', () => {
    it('should schedule notifications for accepted meeting', async () => {
      await scheduleMeetingNotifications(mockMeeting);

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3); // day before, 1 hour, 5 minutes
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Meeting notifications scheduled successfully',
        expect.objectContaining({
          meetingId: 'meeting123',
          notificationCount: 3,
        })
      );
    });

    it('should not schedule notifications for non-accepted meeting', async () => {
      const pendingMeeting = { ...mockMeeting, status: 'pending' as const };
      await scheduleMeetingNotifications(pendingMeeting);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Skipping notification scheduling for non-accepted meeting',
        expect.objectContaining({
          meetingId: 'meeting123',
          status: 'pending',
        })
      );
    });

    it('should not schedule notifications for past meeting', async () => {
      const pastMeeting = {
        ...mockMeeting,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };
      await scheduleMeetingNotifications(pastMeeting);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Skipping notification scheduling for past meeting',
        expect.objectContaining({
          meetingId: 'meeting123',
        })
      );
    });

    it('should skip day-before notification if it is in the past', async () => {
      // Meeting is tomorrow, so day-before is today (should still schedule)
      const tomorrowMeeting = {
        ...mockMeeting,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      await scheduleMeetingNotifications(tomorrowMeeting);

      // Should still schedule 1 hour and 5 minutes notifications
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should handle notification permission denial', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      } as any);

      await scheduleMeetingNotifications(mockMeeting);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Notification permissions not granted, cannot schedule meeting reminders'
      );
    });

    it('should cancel existing notifications before scheduling new ones', async () => {
      // Set up existing notifications in storage
      const existingNotifications = [
        {
          meetingId: 'meeting123',
          notificationIds: ['old_notification_1', 'old_notification_2'],
          scheduledAt: new Date().toISOString(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingNotifications));

      await scheduleMeetingNotifications(mockMeeting);

      // Should cancel old notifications
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old_notification_1');
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old_notification_2');
    });

    it('should handle notification scheduling errors gracefully', async () => {
      mockNotifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error('Scheduling failed'));

      await expect(scheduleMeetingNotifications(mockMeeting)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should create correct notification content for day before', async () => {
      await scheduleMeetingNotifications(mockMeeting);

      const dayBeforeCall = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls.find(
        (call: any) => call[0].content.data.type === 'day_before'
      );
      expect(dayBeforeCall).toBeTruthy();
      expect(dayBeforeCall[0].content.title).toContain('Meeting Reminder');
      expect(dayBeforeCall[0].content.body).toContain('tomorrow');
    });

    it('should create correct notification content for 1 hour before', async () => {
      await scheduleMeetingNotifications(mockMeeting);

      const oneHourCall = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls.find(
        (call: any) => call[0].content.data.type === 'one_hour'
      );
      expect(oneHourCall).toBeTruthy();
      expect(oneHourCall[0].content.title).toContain('Meeting in 1 Hour');
      expect(oneHourCall[0].content.body).toContain('1 hour');
    });

    it('should create correct notification content for 5 minutes before', async () => {
      await scheduleMeetingNotifications(mockMeeting);

      const fiveMinutesCall = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls.find(
        (call: any) => call[0].content.data.type === 'five_minutes'
      );
      expect(fiveMinutesCall).toBeTruthy();
      expect(fiveMinutesCall[0].content.title).toContain('Meeting Starting Soon');
      expect(fiveMinutesCall[0].content.body).toContain('5 minutes');
    });

    it('should include virtual meeting link in notification', async () => {
      const virtualMeeting = {
        ...mockMeeting,
        locationType: 'virtual' as const,
        meetingLink: 'https://meet.example.com/123',
      };
      await scheduleMeetingNotifications(virtualMeeting);

      const calls = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].content.body).toContain('https://meet.example.com/123');
      });
    });

    it('should include in-person location in notification', async () => {
      await scheduleMeetingNotifications(mockMeeting);

      const calls = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].content.body).toContain('Test Location');
      });
    });

    it('should include phone number in notification for phone meetings', async () => {
      const phoneMeeting = {
        ...mockMeeting,
        locationType: 'phone' as const,
        location: '+1234567890',
      };
      await scheduleMeetingNotifications(phoneMeeting);

      const calls = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].content.body).toContain('+1234567890');
      });
    });
  });

  describe('cancelMeetingNotifications', () => {
    it('should cancel all notifications for a meeting', async () => {
      const existingNotifications = [
        {
          meetingId: 'meeting123',
          notificationIds: ['notification_1', 'notification_2', 'notification_3'],
          scheduledAt: new Date().toISOString(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingNotifications));

      await cancelMeetingNotifications('meeting123');

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification_1');
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification_2');
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification_3');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Meeting notifications canceled',
        expect.objectContaining({
          meetingId: 'meeting123',
          canceledCount: 3,
        })
      );
    });

    it('should handle meeting with no scheduled notifications', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));

      await cancelMeetingNotifications('meeting123');

      expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });

    it('should handle cancellation errors gracefully', async () => {
      const existingNotifications = [
        {
          meetingId: 'meeting123',
          notificationIds: ['notification_1'],
          scheduledAt: new Date().toISOString(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingNotifications));
      mockNotifications.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error('Cancel failed'));

      await cancelMeetingNotifications('meeting123');

      expect(mockLogger.warn).toHaveBeenCalled();
      // Should still remove from storage
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      // getScheduledNotifications catches errors and returns empty array, so cancelMeetingNotifications won't throw
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await cancelMeetingNotifications('meeting123');
      // Should complete without throwing since getScheduledNotifications handles the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting scheduled notifications',
        expect.any(Error)
      );
    });
  });

  describe('scheduleNotificationsForMeetings', () => {
    it('should schedule notifications for all accepted meetings', async () => {
      const meetings: Meeting[] = [
        { ...mockMeeting, id: 'meeting1', status: 'accepted' },
        { ...mockMeeting, id: 'meeting2', status: 'accepted' },
        { ...mockMeeting, id: 'meeting3', status: 'pending' },
      ];

      await scheduleNotificationsForMeetings(meetings);

      // Should schedule for 2 accepted meetings (3 notifications each = 6 total)
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Scheduled notifications for meetings',
        expect.objectContaining({
          totalMeetings: 3,
          acceptedMeetings: 2,
        })
      );
    });

    it('should continue scheduling even if one meeting fails', async () => {
      const meetings: Meeting[] = [
        { ...mockMeeting, id: 'meeting1', status: 'accepted' },
        { ...mockMeeting, id: 'meeting2', status: 'accepted' },
      ];

      // Make second meeting fail
      mockNotifications.requestPermissionsAsync
        .mockResolvedValueOnce({ status: 'granted' } as any)
        .mockRejectedValueOnce(new Error('Permission error'));

      await scheduleNotificationsForMeetings(meetings);

      // Should still schedule for first meeting
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle empty meetings array', async () => {
      await scheduleNotificationsForMeetings([]);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Scheduled notifications for meetings',
        expect.objectContaining({
          totalMeetings: 0,
          acceptedMeetings: 0,
        })
      );
    });
  });

  describe('cleanupPastMeetingNotifications', () => {
    it('should clean up past meeting notifications', async () => {
      const existingNotifications = [
        {
          meetingId: 'meeting1',
          notificationIds: ['notification_1'],
          scheduledAt: new Date().toISOString(),
        },
        {
          meetingId: 'meeting2',
          notificationIds: ['notification_2'],
          scheduledAt: new Date().toISOString(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingNotifications));

      await cleanupPastMeetingNotifications();

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up past meeting notifications',
        expect.objectContaining({
          remainingNotifications: 2,
        })
      );
    });

    it('should handle storage errors gracefully', async () => {
      // getScheduledNotifications catches errors and returns empty array, so cleanupPastMeetingNotifications won't throw
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await cleanupPastMeetingNotifications();
      // Should complete without throwing since getScheduledNotifications handles the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting scheduled notifications',
        expect.any(Error)
      );
    });
  });
});
