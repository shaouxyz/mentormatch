/**
 * Firebase Meeting Service
 * 
 * Handles all meeting-related operations with Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

const MEETINGS_COLLECTION = 'meetings';

/**
 * Create a meeting request
 */
export async function createMeetingRequest(meeting: Omit<Meeting, 'id'>): Promise<Meeting> {
  try {
    const db = getFirebaseFirestore();
    const meetingsRef = collection(db, MEETINGS_COLLECTION);
    
    const docRef = await addDoc(meetingsRef, {
      ...meeting,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    const newMeeting: Meeting = {
      id: docRef.id,
      ...meeting,
    };
    
    logger.info('Meeting request created in Firestore', { meetingId: docRef.id });
    return newMeeting;
  } catch (error) {
    logger.error('Error creating meeting request in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get a meeting by ID
 */
export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  try {
    const db = getFirebaseFirestore();
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    const meetingSnap = await getDoc(meetingRef);
    
    if (meetingSnap.exists()) {
      logger.info('Meeting retrieved from Firestore', { meetingId });
      return { id: meetingSnap.id, ...meetingSnap.data() } as Meeting;
    }
    
    logger.info('Meeting not found in Firestore', { meetingId });
    return null;
  } catch (error) {
    logger.error('Error getting meeting from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update meeting (for accepting/declining/cancelling)
 */
export async function updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    
    await updateDoc(meetingRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    logger.info('Meeting updated in Firestore', { meetingId });
  } catch (error) {
    logger.error('Error updating meeting in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    
    await deleteDoc(meetingRef);
    
    logger.info('Meeting deleted from Firestore', { meetingId });
  } catch (error) {
    logger.error('Error deleting meeting from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all meetings for a user
 */
export async function getUserMeetings(userEmail: string): Promise<Meeting[]> {
  try {
    const db = getFirebaseFirestore();
    const meetingsRef = collection(db, MEETINGS_COLLECTION);
    
    // Get meetings where user is organizer
    const organizerQuery = query(
      meetingsRef,
      where('organizerEmail', '==', userEmail),
      orderBy('date', 'asc')
    );
    
    // Get meetings where user is participant
    const participantQuery = query(
      meetingsRef,
      where('participantEmail', '==', userEmail),
      orderBy('date', 'asc')
    );
    
    const [organizerSnapshot, participantSnapshot] = await Promise.all([
      getDocs(organizerQuery),
      getDocs(participantQuery),
    ]);
    
    const meetings: Meeting[] = [];
    const meetingIds = new Set<string>();
    
    organizerSnapshot.forEach((doc) => {
      meetings.push({ id: doc.id, ...doc.data() } as Meeting);
      meetingIds.add(doc.id);
    });
    
    participantSnapshot.forEach((doc) => {
      if (!meetingIds.has(doc.id)) {
        meetings.push({ id: doc.id, ...doc.data() } as Meeting);
      }
    });
    
    // Sort by date
    meetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    logger.info('Meetings retrieved from Firestore', { userEmail, count: meetings.length });
    return meetings;
  } catch (error) {
    logger.error('Error getting meetings from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get pending meeting requests for a user
 */
export async function getPendingMeetingRequests(userEmail: string): Promise<Meeting[]> {
  try {
    const db = getFirebaseFirestore();
    const meetingsRef = collection(db, MEETINGS_COLLECTION);
    
    const q = query(
      meetingsRef,
      where('participantEmail', '==', userEmail),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const meetings: Meeting[] = [];
    
    querySnapshot.forEach((doc) => {
      meetings.push({ id: doc.id, ...doc.data() } as Meeting);
    });
    
    logger.info('Pending meeting requests retrieved', { userEmail, count: meetings.length });
    return meetings;
  } catch (error) {
    logger.error('Error getting pending meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get upcoming confirmed meetings
 */
export async function getUpcomingMeetings(userEmail: string): Promise<Meeting[]> {
  try {
    const db = getFirebaseFirestore();
    const meetings = await getUserMeetings(userEmail);
    
    const now = new Date();
    const upcomingMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      return meetingDate >= now && meeting.status === 'accepted';
    });
    
    logger.info('Upcoming meetings retrieved', { userEmail, count: upcomingMeetings.length });
    return upcomingMeetings;
  } catch (error) {
    logger.error('Error getting upcoming meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Subscribe to meeting updates
 */
export function subscribeToUserMeetings(
  userEmail: string,
  onMeetingsUpdate: (meetings: Meeting[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const db = getFirebaseFirestore();
    const meetingsRef = collection(db, MEETINGS_COLLECTION);
    
    // Subscribe to meetings where user is organizer or participant
    const q1 = query(meetingsRef, where('organizerEmail', '==', userEmail));
    const q2 = query(meetingsRef, where('participantEmail', '==', userEmail));
    
    const meetings: Map<string, Meeting> = new Map();
    let unsubscribeCount = 0;
    
    const updateMeetings = () => {
      unsubscribeCount++;
      if (unsubscribeCount >= 2) {
        const allMeetings = Array.from(meetings.values());
        allMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        onMeetingsUpdate(allMeetings);
      }
    };
    
    const unsubscribe1 = onSnapshot(
      q1,
      (querySnapshot) => {
        querySnapshot.forEach((doc) => {
          meetings.set(doc.id, { id: doc.id, ...doc.data() } as Meeting);
        });
        updateMeetings();
      },
      (error) => {
        logger.error('Error in meetings subscription (organizer)', error);
        if (onError) onError(error as Error);
      }
    );
    
    const unsubscribe2 = onSnapshot(
      q2,
      (querySnapshot) => {
        querySnapshot.forEach((doc) => {
          meetings.set(doc.id, { id: doc.id, ...doc.data() } as Meeting);
        });
        updateMeetings();
      },
      (error) => {
        logger.error('Error in meetings subscription (participant)', error);
        if (onError) onError(error as Error);
      }
    );
    
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  } catch (error) {
    logger.error('Error subscribing to meetings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
