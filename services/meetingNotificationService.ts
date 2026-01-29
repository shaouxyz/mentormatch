/**
 * Meeting Notification Service
 * 
 * Handles scheduling and managing meeting reminders/notifications
 * - Day before the meeting
 * - 1 hour before the meeting
 * - 5 minutes before the meeting
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

const NOTIFICATION_STORAGE_KEY = 'scheduledMeetingNotifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface ScheduledNotification {
  meetingId: string;
  notificationIds: string[]; // Array of notification IDs for this meeting
  scheduledAt: string; // ISO timestamp when notifications were scheduled
}

/**
 * Get all scheduled notifications from storage
 */
async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Error getting scheduled notifications', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Save scheduled notifications to storage
 */
async function saveScheduledNotifications(notifications: ScheduledNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    logger.error('Error saving scheduled notifications', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Calculate notification times for a meeting
 */
function calculateNotificationTimes(meetingDateTime: Date): {
  dayBefore: Date;
  oneHourBefore: Date;
  fiveMinutesBefore: Date;
} {
  const dayBefore = new Date(meetingDateTime);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0, 0); // 9 AM the day before

  const oneHourBefore = new Date(meetingDateTime);
  oneHourBefore.setHours(oneHourBefore.getHours() - 1);

  const fiveMinutesBefore = new Date(meetingDateTime);
  fiveMinutesBefore.setMinutes(fiveMinutesBefore.getMinutes() - 5);

  return {
    dayBefore,
    oneHourBefore,
    fiveMinutesBefore,
  };
}

/**
 * Create notification content for a meeting
 */
function createNotificationContent(
  meeting: Meeting,
  reminderType: 'day_before' | 'one_hour' | 'five_minutes'
): { title: string; body: string } {
  const meetingDate = new Date(meeting.time);
  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = meetingDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const locationInfo = meeting.locationType === 'virtual' && meeting.meetingLink
    ? `Link: ${meeting.meetingLink}`
    : meeting.locationType === 'in-person' && meeting.location
    ? `Location: ${meeting.location}`
    : meeting.locationType === 'phone' && meeting.location
    ? `Phone: ${meeting.location}`
    : '';

  switch (reminderType) {
    case 'day_before':
      return {
        title: `Meeting Reminder: ${meeting.title}`,
        body: `Your meeting with ${meeting.organizerEmail === meeting.participantEmail ? meeting.participantName : meeting.organizerName} is tomorrow at ${formattedTime} on ${formattedDate}. ${locationInfo}`,
      };
    case 'one_hour':
      return {
        title: `Meeting in 1 Hour: ${meeting.title}`,
        body: `Your meeting with ${meeting.organizerEmail === meeting.participantEmail ? meeting.participantName : meeting.organizerName} starts in 1 hour at ${formattedTime}. ${locationInfo}`,
      };
    case 'five_minutes':
      return {
        title: `Meeting Starting Soon: ${meeting.title}`,
        body: `Your meeting with ${meeting.organizerEmail === meeting.participantEmail ? meeting.participantName : meeting.organizerName} starts in 5 minutes at ${formattedTime}. ${locationInfo}`,
      };
  }
}

/**
 * Schedule notifications for a meeting
 */
export async function scheduleMeetingNotifications(meeting: Meeting): Promise<void> {
  try {
    // Only schedule notifications for accepted meetings
    if (meeting.status !== 'accepted') {
      logger.info('Skipping notification scheduling for non-accepted meeting', {
        meetingId: meeting.id,
        status: meeting.status,
      });
      return;
    }

    const meetingDateTime = new Date(meeting.time);
    const now = new Date();

    // Don't schedule notifications for past meetings
    if (meetingDateTime <= now) {
      logger.info('Skipping notification scheduling for past meeting', {
        meetingId: meeting.id,
        meetingTime: meeting.time,
      });
      return;
    }

    // Cancel any existing notifications for this meeting
    await cancelMeetingNotifications(meeting.id);

    const { dayBefore, oneHourBefore, fiveMinutesBefore } = calculateNotificationTimes(meetingDateTime);
    const notificationIds: string[] = [];

    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      logger.warn('Notification permissions not granted, cannot schedule meeting reminders');
      return;
    }

    // Schedule day before notification (only if it's in the future)
    if (dayBefore > now) {
      const dayBeforeContent = createNotificationContent(meeting, 'day_before');
      const dayBeforeId = await Notifications.scheduleNotificationAsync({
        content: {
          title: dayBeforeContent.title,
          body: dayBeforeContent.body,
          data: {
            meetingId: meeting.id,
            type: 'day_before',
          },
        },
        trigger: dayBefore,
      });
      notificationIds.push(dayBeforeId);
      logger.info('Scheduled day-before notification', {
        meetingId: meeting.id,
        notificationId: dayBeforeId,
        scheduledFor: dayBefore.toISOString(),
      });
    }

    // Schedule 1 hour before notification (only if it's in the future)
    if (oneHourBefore > now) {
      const oneHourContent = createNotificationContent(meeting, 'one_hour');
      const oneHourId = await Notifications.scheduleNotificationAsync({
        content: {
          title: oneHourContent.title,
          body: oneHourContent.body,
          data: {
            meetingId: meeting.id,
            type: 'one_hour',
          },
        },
        trigger: oneHourBefore,
      });
      notificationIds.push(oneHourId);
      logger.info('Scheduled 1-hour-before notification', {
        meetingId: meeting.id,
        notificationId: oneHourId,
        scheduledFor: oneHourBefore.toISOString(),
      });
    }

    // Schedule 5 minutes before notification (only if it's in the future)
    if (fiveMinutesBefore > now) {
      const fiveMinutesContent = createNotificationContent(meeting, 'five_minutes');
      const fiveMinutesId = await Notifications.scheduleNotificationAsync({
        content: {
          title: fiveMinutesContent.title,
          body: fiveMinutesContent.body,
          data: {
            meetingId: meeting.id,
            type: 'five_minutes',
          },
        },
        trigger: fiveMinutesBefore,
      });
      notificationIds.push(fiveMinutesId);
      logger.info('Scheduled 5-minutes-before notification', {
        meetingId: meeting.id,
        notificationId: fiveMinutesId,
        scheduledFor: fiveMinutesBefore.toISOString(),
      });
    }

    // Save notification IDs to storage
    if (notificationIds.length > 0) {
      const scheduled = await getScheduledNotifications();
      const existingIndex = scheduled.findIndex((n) => n.meetingId === meeting.id);
      const notificationRecord: ScheduledNotification = {
        meetingId: meeting.id,
        notificationIds,
        scheduledAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        scheduled[existingIndex] = notificationRecord;
      } else {
        scheduled.push(notificationRecord);
      }

      await saveScheduledNotifications(scheduled);
      logger.info('Meeting notifications scheduled successfully', {
        meetingId: meeting.id,
        notificationCount: notificationIds.length,
      });
    } else {
      logger.info('No notifications scheduled (all times are in the past)', {
        meetingId: meeting.id,
      });
    }
  } catch (error) {
    logger.error('Error scheduling meeting notifications', error instanceof Error ? error : new Error(String(error)), {
      meetingId: meeting.id,
    });
    throw error;
  }
}

/**
 * Cancel all notifications for a meeting
 */
export async function cancelMeetingNotifications(meetingId: string): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    const notificationRecord = scheduled.find((n) => n.meetingId === meetingId);

    if (notificationRecord) {
      // Cancel all notifications
      for (const notificationId of notificationRecord.notificationIds) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (error) {
          logger.warn('Error canceling notification', {
            notificationId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Remove from storage
      const updated = scheduled.filter((n) => n.meetingId !== meetingId);
      await saveScheduledNotifications(updated);

      logger.info('Meeting notifications canceled', {
        meetingId,
        canceledCount: notificationRecord.notificationIds.length,
      });
    }
  } catch (error) {
    logger.error('Error canceling meeting notifications', error instanceof Error ? error : new Error(String(error)), {
      meetingId,
    });
    throw error;
  }
}

/**
 * Schedule notifications for multiple meetings
 */
export async function scheduleNotificationsForMeetings(meetings: Meeting[]): Promise<void> {
  try {
    const acceptedMeetings = meetings.filter((m) => m.status === 'accepted');
    
    for (const meeting of acceptedMeetings) {
      try {
        await scheduleMeetingNotifications(meeting);
      } catch (error) {
        logger.error('Error scheduling notifications for meeting', error instanceof Error ? error : new Error(String(error)), {
          meetingId: meeting.id,
        });
        // Continue with other meetings even if one fails
      }
    }

    logger.info('Scheduled notifications for meetings', {
      totalMeetings: meetings.length,
      acceptedMeetings: acceptedMeetings.length,
    });
  } catch (error) {
    logger.error('Error scheduling notifications for meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Clean up notifications for past meetings
 */
export async function cleanupPastMeetingNotifications(): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    const now = new Date();
    const activeNotifications: ScheduledNotification[] = [];

    for (const notificationRecord of scheduled) {
      // We can't easily check if the meeting is past without the meeting data,
      // so we'll rely on the notification system to handle expired notifications
      // But we can clean up if all notifications have been sent (they expire after being sent)
      activeNotifications.push(notificationRecord);
    }

    // For now, we'll keep all scheduled notifications and let the system handle expiration
    // In a production system, you might want to periodically clean up old records
    await saveScheduledNotifications(activeNotifications);

    logger.info('Cleaned up past meeting notifications', {
      remainingNotifications: activeNotifications.length,
    });
  } catch (error) {
    logger.error('Error cleaning up past meeting notifications', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
