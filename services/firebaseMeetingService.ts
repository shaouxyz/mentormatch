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
import { getAuth } from 'firebase/auth';
import { getFirebaseFirestore, getFirebaseApp } from '@/config/firebase.config';
import { Meeting } from '@/types/types';
import { logger } from '@/utils/logger';

const MEETINGS_COLLECTION = 'meetings';

function normalizeEmail(email: string | undefined | null): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Create a meeting request
 */
export async function createMeetingRequest(meeting: Omit<Meeting, 'id'>): Promise<Meeting> {
  try {
    const db = getFirebaseFirestore();
    const meetingsRef = collection(db, MEETINGS_COLLECTION);

    const organizerEmail = normalizeEmail(meeting.organizerEmail);
    const participantEmail = normalizeEmail(meeting.participantEmail);

    // Prepare meeting data for Firestore (normalized emails + _lower for case-insensitive queries/rules)
    const meetingData: any = {
      organizerEmail,
      organizerName: meeting.organizerName,
      participantEmail,
      participantName: meeting.participantName,
      organizerEmailLower: organizerEmail,
      participantEmailLower: participantEmail,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      duration: meeting.duration,
      location: meeting.location || '',
      locationType: meeting.locationType,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add optional fields if present
    if (meeting.description) {
      meetingData.description = meeting.description;
    }
    if (meeting.meetingLink) {
      meetingData.meetingLink = meeting.meetingLink;
    }
    
    logger.info('Creating meeting request in Firestore', {
      organizerEmail: meeting.organizerEmail,
      participantEmail: meeting.participantEmail,
      title: meeting.title,
      locationType: meeting.locationType
    });
    
    const docRef = await addDoc(meetingsRef, meetingData);
    
    const newMeeting: Meeting = {
      id: docRef.id,
      ...meeting,
      organizerEmail,
      participantEmail,
      status: 'pending',
      createdAt: meetingData.createdAt,
      updatedAt: meetingData.updatedAt,
    };
    
    logger.info('Meeting request created in Firestore successfully', { 
      meetingId: docRef.id,
      organizerEmail: meeting.organizerEmail,
      participantEmail: meeting.participantEmail
    });
    return newMeeting;
  } catch (error) {
    logger.error('Error creating meeting request in Firestore', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      organizerEmail: meeting.organizerEmail,
      participantEmail: meeting.participantEmail
    });
    throw error;
  }
}

/**
 * Get a meeting by ID.
 * Backfills organizerEmailLower/participantEmailLower when missing so list queries find the meeting.
 */
export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  try {
    const db = getFirebaseFirestore();
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    const meetingSnap = await getDoc(meetingRef);
    
    if (meetingSnap.exists()) {
      const data = meetingSnap.data() as Record<string, unknown>;
      const needsLower = !data.organizerEmailLower || !data.participantEmailLower;
      if (needsLower) {
        const normOrganizer = normalizeEmail(data.organizerEmail as string);
        const normParticipant = normalizeEmail(data.participantEmail as string);
        try {
          await updateDoc(meetingRef, {
            organizerEmailLower: normOrganizer,
            participantEmailLower: normParticipant,
            updatedAt: new Date().toISOString(),
          });
          logger.info('Meeting backfilled with email lower fields', { meetingId });
        } catch (backfillError) {
          logger.warn('Could not backfill meeting email lower fields', {
            meetingId,
            error: backfillError instanceof Error ? backfillError.message : String(backfillError),
          });
        }
      }
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
    // Check authentication status before attempting update
    let authStatus = { isAuthenticated: false, email: null as string | null, uid: null as string | null };
    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      authStatus = {
        isAuthenticated: !!currentUser,
        email: currentUser?.email || null,
        uid: currentUser?.uid || null,
      };
      logger.info('Firebase auth status before meeting update', authStatus);
    } catch (authCheckError) {
      logger.warn('Could not check Firebase auth status', {
        error: authCheckError instanceof Error ? authCheckError.message : String(authCheckError),
      });
    }
    
    if (!authStatus.isAuthenticated) {
      const error = new Error('User not authenticated in Firebase. Please log in again.');
      logger.error('Cannot update meeting: user not authenticated', { meetingId, authStatus });
      throw error;
    }
    
    const db = getFirebaseFirestore();
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    
    // Check if meeting exists first
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists()) {
      const error = new Error(`Meeting not found in Firestore: ${meetingId}`);
      logger.error('Meeting not found in Firestore before update', { meetingId, authStatus });
      throw error;
    }
    
    // Verify user has permission (organizer or participant); compare normalized for cross-device casing
    const meetingData = meetingSnap.data() as Meeting;
    const userEmail = authStatus.email ? normalizeEmail(authStatus.email) : '';
    const isOrganizer = normalizeEmail(meetingData.organizerEmail) === userEmail;
    const isParticipant = normalizeEmail(meetingData.participantEmail) === userEmail;
    
    logger.info('Meeting update permission check', {
      meetingId,
      userEmail,
      organizerEmail: meetingData.organizerEmail,
      participantEmail: meetingData.participantEmail,
      isOrganizer,
      isParticipant,
      canUpdate: isOrganizer || isParticipant,
    });
    
    if (!isOrganizer && !isParticipant) {
      const error = new Error(`User ${userEmail} is not authorized to update this meeting. Must be organizer or participant.`);
      logger.error('Permission denied: user is not organizer or participant', {
        meetingId,
        userEmail,
        organizerEmail: meetingData.organizerEmail,
        participantEmail: meetingData.participantEmail,
      });
      throw error;
    }
    
    // Note: Actual permission check is also done by Firestore security rules
    // This client-side check is for better error messages and debugging

    // Normalize emails in doc so future queries find this meeting (backward compatibility)
    const normOrganizer = normalizeEmail(meetingData.organizerEmail);
    const normParticipant = normalizeEmail(meetingData.participantEmail);
    if (meetingData.organizerEmail !== normOrganizer || meetingData.participantEmail !== normParticipant) {
      meetingData.organizerEmail = normOrganizer;
      meetingData.participantEmail = normParticipant;
    }
    
    // Filter out undefined values (Firestore doesn't allow undefined)
    const updateData: any = {
      updatedAt: new Date().toISOString(),
      organizerEmail: meetingData.organizerEmail,
      participantEmail: meetingData.participantEmail,
      organizerEmailLower: normOrganizer,
      participantEmailLower: normParticipant,
    };
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    
    await updateDoc(meetingRef, updateData);
    
    logger.info('Meeting updated in Firestore successfully', { 
      meetingId, 
      updates,
      userEmail,
      isOrganizer,
      isParticipant,
    });
  } catch (error) {
    // Enhanced error logging with Firebase error codes
    const firebaseError = error as any;
    logger.error('Error updating meeting in Firestore', {
      meetingId,
      error: error instanceof Error ? error.message : String(error),
      errorCode: firebaseError?.code,
      errorName: firebaseError?.name,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
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
 * Get all meetings for a user.
 * Tries organizerEmailLower/participantEmailLower first; on permission error (e.g. rules
 * not deployed or missing index) falls back to organizerEmail/participantEmail.
 */
export async function getUserMeetings(userEmail: string): Promise<Meeting[]> {
  const normalizedEmail = normalizeEmail(userEmail);
  const db = getFirebaseFirestore();
  const meetingsRef = collection(db, MEETINGS_COLLECTION);

  const runQueries = (useLower: boolean) => {
    const orgField = useLower ? 'organizerEmailLower' : 'organizerEmail';
    const partField = useLower ? 'participantEmailLower' : 'participantEmail';
    const organizerQuery = query(
      meetingsRef,
      where(orgField, '==', normalizedEmail),
      orderBy('date', 'asc')
    );
    const participantQuery = query(
      meetingsRef,
      where(partField, '==', normalizedEmail),
      orderBy('date', 'asc')
    );
    return Promise.all([getDocs(organizerQuery), getDocs(participantQuery)]);
  };

  const mergeSnapshots = (snapshots: Awaited<ReturnType<typeof runQueries>>) => {
    const meetings: Meeting[] = [];
    const meetingIds = new Set<string>();
    for (const snapshot of snapshots) {
      snapshot.forEach((docSnap) => {
        if (!meetingIds.has(docSnap.id)) {
          meetingIds.add(docSnap.id);
          meetings.push({ id: docSnap.id, ...docSnap.data() } as Meeting);
        }
      });
    }
    meetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return meetings;
  };

  try {
    const snapshots = await runQueries(true);
    const meetings = mergeSnapshots(snapshots);
    logger.info('Meetings retrieved from Firestore', { userEmail: normalizedEmail, count: meetings.length });
    return meetings;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
    const isPermissionError =
      code === 'permission-denied' || (error instanceof Error && error.message?.includes('permission'));
    const isIndexError = code === 'failed-precondition' || (err.message?.includes('index') ?? false);
    if (isPermissionError || isIndexError) {
      try {
        const snapshots = await runQueries(false);
        const meetings = mergeSnapshots(snapshots);
        logger.info('Meetings retrieved from Firestore (fallback fields)', {
          userEmail: normalizedEmail,
          count: meetings.length,
        });
        return meetings;
      } catch (fallbackError) {
        const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        logger.error('Error getting meetings from Firestore (fallback)', fallbackErr);
        throw fallbackError;
      }
    }
    logger.error('Error getting meetings from Firestore', err, { code });
    throw error;
  }
}

/**
 * Get pending meeting requests for a user (participant).
 * Tries participantEmailLower first; on permission error falls back to participantEmail.
 */
export async function getPendingMeetingRequests(userEmail: string): Promise<Meeting[]> {
  const normalizedEmail = normalizeEmail(userEmail);
  const db = getFirebaseFirestore();
  const meetingsRef = collection(db, MEETINGS_COLLECTION);

  const runQuery = (useLower: boolean) => {
    const partField = useLower ? 'participantEmailLower' : 'participantEmail';
    const q = query(
      meetingsRef,
      where(partField, '==', normalizedEmail),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    return getDocs(q);
  };

  const toMeetings = (snapshot: Awaited<ReturnType<typeof runQuery>>) => {
    const meetings: Meeting[] = [];
    snapshot.forEach((docSnap) => meetings.push({ id: docSnap.id, ...docSnap.data() } as Meeting));
    meetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return meetings;
  };

  try {
    const snapshot = await runQuery(true);
    const meetings = toMeetings(snapshot);
    logger.info('Pending meeting requests retrieved', { userEmail: normalizedEmail, count: meetings.length });
    return meetings;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
    const isPermissionError =
      code === 'permission-denied' || (error instanceof Error && error.message?.includes('permission'));
    const isIndexError = code === 'failed-precondition' || (err.message?.includes('index') ?? false);
    if (isPermissionError || isIndexError) {
      try {
        const snapshot = await runQuery(false);
        const meetings = toMeetings(snapshot);
        logger.info('Pending meeting requests retrieved (fallback)', { userEmail: normalizedEmail, count: meetings.length });
        return meetings;
      } catch (fallbackError) {
        const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        logger.error('Error getting pending meetings (fallback)', fallbackErr);
        throw fallbackError;
      }
    }
    logger.error('Error getting pending meetings', err, { code });
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
 * Subscribe to meeting updates.
 */
export function subscribeToUserMeetings(
  userEmail: string,
  onMeetingsUpdate: (meetings: Meeting[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const normalizedEmail = normalizeEmail(userEmail);
    const db = getFirebaseFirestore();
    const meetingsRef = collection(db, MEETINGS_COLLECTION);

    const q1 = query(meetingsRef, where('organizerEmailLower', '==', normalizedEmail));
    const q2 = query(meetingsRef, where('participantEmailLower', '==', normalizedEmail));
    const meetings: Map<string, Meeting> = new Map();
    let updateCount = 0;

    const updateMeetings = () => {
      updateCount++;
      if (updateCount >= 2) {
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
