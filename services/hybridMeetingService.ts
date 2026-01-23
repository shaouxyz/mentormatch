/**
 * Hybrid Meeting Service
 * 
 * Combines local storage with Firebase Firestore for meeting management
 * Falls back to local storage if Firebase is not available
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/config/firebase.config';
import {
  createMeetingRequest,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  getUserMeetings,
  getPendingMeetingRequests,
  getUpcomingMeetings,
  subscribeToUserMeetings,
} from './firebaseMeetingService';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

const LOCAL_MEETINGS_KEY = 'meetings';

/**
 * Get local meetings from AsyncStorage
 */
async function getLocalMeetings(): Promise<Meeting[]> {
  try {
    const meetingsData = await AsyncStorage.getItem(LOCAL_MEETINGS_KEY);
    return meetingsData ? JSON.parse(meetingsData) : [];
  } catch (error) {
    logger.error('Error getting local meetings', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Save local meetings to AsyncStorage
 */
async function saveLocalMeetings(meetings: Meeting[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_MEETINGS_KEY, JSON.stringify(meetings));
  } catch (error) {
    logger.error('Error saving local meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Create a meeting request (hybrid)
 */
export async function hybridCreateMeeting(meeting: Omit<Meeting, 'id'>): Promise<Meeting> {
  try {
    if (isFirebaseConfigured()) {
      // Use Firebase
      const newMeeting = await createMeetingRequest(meeting);
      
      // Also save locally for offline access
      const localMeetings = await getLocalMeetings();
      localMeetings.push(newMeeting);
      await saveLocalMeetings(localMeetings);
      
      logger.info('Meeting created via Firebase and cached locally', { meetingId: newMeeting.id });
      return newMeeting;
    } else {
      // Local-only mode
      const newMeeting: Meeting = {
        id: `local_${Date.now()}`,
        ...meeting,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const localMeetings = await getLocalMeetings();
      localMeetings.push(newMeeting);
      await saveLocalMeetings(localMeetings);
      
      logger.info('Meeting created locally (Firebase not configured)', { meetingId: newMeeting.id });
      return newMeeting;
    }
  } catch (error) {
    logger.error('Error in hybrid create meeting', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get a meeting by ID (hybrid)
 */
export async function hybridGetMeeting(meetingId: string): Promise<Meeting | null> {
  try {
    if (isFirebaseConfigured()) {
      const meeting = await getMeeting(meetingId);
      logger.info('Meeting retrieved via Firebase', { meetingId });
      return meeting;
    } else {
      // Local-only mode
      const localMeetings = await getLocalMeetings();
      const meeting = localMeetings.find(m => m.id === meetingId) || null;
      logger.info('Meeting retrieved locally', { meetingId });
      return meeting;
    }
  } catch (error) {
    logger.error('Error in hybrid get meeting', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update meeting (hybrid)
 */
export async function hybridUpdateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void> {
  try {
    if (isFirebaseConfigured()) {
      await updateMeeting(meetingId, updates);
      
      // Also update locally
      const localMeetings = await getLocalMeetings();
      const index = localMeetings.findIndex(m => m.id === meetingId);
      if (index !== -1) {
        localMeetings[index] = { ...localMeetings[index], ...updates, updatedAt: new Date().toISOString() };
        await saveLocalMeetings(localMeetings);
      }
      
      logger.info('Meeting updated via Firebase and locally', { meetingId });
    } else {
      // Local-only mode
      const localMeetings = await getLocalMeetings();
      const index = localMeetings.findIndex(m => m.id === meetingId);
      if (index !== -1) {
        localMeetings[index] = { ...localMeetings[index], ...updates, updatedAt: new Date().toISOString() };
        await saveLocalMeetings(localMeetings);
        logger.info('Meeting updated locally', { meetingId });
      } else {
        throw new Error(`Meeting not found: ${meetingId}`);
      }
    }
  } catch (error) {
    logger.error('Error in hybrid update meeting', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete meeting (hybrid)
 */
export async function hybridDeleteMeeting(meetingId: string): Promise<void> {
  try {
    if (isFirebaseConfigured()) {
      await deleteMeeting(meetingId);
      
      // Also delete locally
      const localMeetings = await getLocalMeetings();
      const filteredMeetings = localMeetings.filter(m => m.id !== meetingId);
      await saveLocalMeetings(filteredMeetings);
      
      logger.info('Meeting deleted via Firebase and locally', { meetingId });
    } else {
      // Local-only mode
      const localMeetings = await getLocalMeetings();
      const filteredMeetings = localMeetings.filter(m => m.id !== meetingId);
      await saveLocalMeetings(filteredMeetings);
      logger.info('Meeting deleted locally', { meetingId });
    }
  } catch (error) {
    logger.error('Error in hybrid delete meeting', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all meetings for a user (hybrid)
 */
export async function hybridGetUserMeetings(userEmail: string): Promise<Meeting[]> {
  try {
    if (isFirebaseConfigured()) {
      const meetings = await getUserMeetings(userEmail);
      
      // Cache locally
      await saveLocalMeetings(meetings);
      
      logger.info('User meetings retrieved via Firebase', { userEmail, count: meetings.length });
      return meetings;
    } else {
      // Local-only mode
      const localMeetings = await getLocalMeetings();
      const userMeetings = localMeetings.filter(
        m => m.organizerEmail === userEmail || m.participantEmail === userEmail
      );
      userMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      logger.info('User meetings retrieved locally', { userEmail, count: userMeetings.length });
      return userMeetings;
    }
  } catch (error) {
    logger.error('Error in hybrid get user meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get pending meeting requests (hybrid)
 */
export async function hybridGetPendingMeetings(userEmail: string): Promise<Meeting[]> {
  try {
    if (isFirebaseConfigured()) {
      const meetings = await getPendingMeetingRequests(userEmail);
      logger.info('Pending meetings retrieved via Firebase', { userEmail, count: meetings.length });
      return meetings;
    } else {
      // Local-only mode
      const localMeetings = await getLocalMeetings();
      const pendingMeetings = localMeetings.filter(
        m => m.participantEmail === userEmail && m.status === 'pending'
      );
      pendingMeetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      logger.info('Pending meetings retrieved locally', { userEmail, count: pendingMeetings.length });
      return pendingMeetings;
    }
  } catch (error) {
    logger.error('Error in hybrid get pending meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get upcoming confirmed meetings (hybrid)
 */
export async function hybridGetUpcomingMeetings(userEmail: string): Promise<Meeting[]> {
  try {
    if (isFirebaseConfigured()) {
      const meetings = await getUpcomingMeetings(userEmail);
      logger.info('Upcoming meetings retrieved via Firebase', { userEmail, count: meetings.length });
      return meetings;
    } else {
      // Local-only mode
      const localMeetings = await getLocalMeetings();
      const now = new Date();
      const upcomingMeetings = localMeetings.filter(m => {
        const meetingDate = new Date(m.date);
        return meetingDate >= now && 
               m.status === 'accepted' && 
               (m.organizerEmail === userEmail || m.participantEmail === userEmail);
      });
      upcomingMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      logger.info('Upcoming meetings retrieved locally', { userEmail, count: upcomingMeetings.length });
      return upcomingMeetings;
    }
  } catch (error) {
    logger.error('Error in hybrid get upcoming meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Subscribe to meeting updates (hybrid)
 */
export function hybridSubscribeToMeetings(
  userEmail: string,
  callback: (meetings: Meeting[]) => void
): () => void {
  if (isFirebaseConfigured()) {
    logger.info('Subscribing to meetings via Firebase', { userEmail });
    return subscribeToUserMeetings(userEmail, callback);
  } else {
    logger.info('Firebase not configured, using local meetings', { userEmail });
    // For local-only, just load once and call callback
    hybridGetUserMeetings(userEmail).then(callback);
    return () => logger.info('Local meeting subscription unsubscribed');
  }
}
