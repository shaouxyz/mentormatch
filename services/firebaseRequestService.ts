/**
 * Firebase Request Service
 * 
 * Handles all mentorship request operations with Firestore
 * This service can be used alongside or to replace the local AsyncStorage-based requestService
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';
import { MentorshipRequest } from '@/types/types';
import { logger } from '@/utils/logger';

const REQUESTS_COLLECTION = 'mentorshipRequests';

/**
 * Get Firestore requests collection reference
 */
function getRequestsCollection() {
  const db = getFirebaseFirestore();
  return collection(db, REQUESTS_COLLECTION);
}

/**
 * Create a new mentorship request in Firestore
 */
export async function createFirebaseRequest(request: MentorshipRequest): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const requestRef = doc(db, REQUESTS_COLLECTION, request.id);
    
    await setDoc(requestRef, {
      ...request,
      createdAt: request.createdAt || new Date().toISOString(),
    });
    
    logger.info('Request created in Firestore', { requestId: request.id });
  } catch (error) {
    logger.error('Error creating request in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get a request by ID from Firestore
 */
export async function getFirebaseRequest(requestId: string): Promise<MentorshipRequest | null> {
  try {
    const db = getFirebaseFirestore();
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (requestSnap.exists()) {
      const data = requestSnap.data() as MentorshipRequest;
      logger.info('Request retrieved from Firestore', { requestId });
      return data;
    }
    
    logger.info('Request not found in Firestore', { requestId });
    return null;
  } catch (error) {
    logger.error('Error getting request from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update a request in Firestore
 */
export async function updateFirebaseRequest(
  requestId: string,
  updates: Partial<MentorshipRequest>
): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    
    await updateDoc(requestRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    logger.info('Request updated in Firestore', { requestId });
  } catch (error) {
    logger.error('Error updating request in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete a request from Firestore
 */
export async function deleteFirebaseRequest(requestId: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    
    await deleteDoc(requestRef);
    
    logger.info('Request deleted from Firestore', { requestId });
  } catch (error) {
    logger.error('Error deleting request from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all requests sent by a user
 */
export async function getFirebaseRequestsBySender(userEmail: string): Promise<MentorshipRequest[]> {
  try {
    const requestsCol = getRequestsCollection();
    const q = query(
      requestsCol,
      where('requesterEmail', '==', userEmail),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const requests: MentorshipRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push(doc.data() as MentorshipRequest);
    });
    
    logger.info('Requests by sender retrieved from Firestore', { userEmail, count: requests.length });
    return requests;
  } catch (error) {
    logger.error('Error getting requests by sender from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all requests received by a user (as mentor)
 */
export async function getFirebaseRequestsByMentor(mentorEmail: string): Promise<MentorshipRequest[]> {
  try {
    const requestsCol = getRequestsCollection();
    const q = query(
      requestsCol,
      where('mentorEmail', '==', mentorEmail),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const requests: MentorshipRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push(doc.data() as MentorshipRequest);
    });
    
    logger.info('Requests by mentor retrieved from Firestore', { mentorEmail, count: requests.length });
    return requests;
  } catch (error) {
    logger.error('Error getting requests by mentor from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all requests for a user (both sent and received)
 */
export async function getAllFirebaseRequestsForUser(userEmail: string): Promise<{
  sent: MentorshipRequest[];
  received: MentorshipRequest[];
}> {
  try {
    const [sent, received] = await Promise.all([
      getFirebaseRequestsBySender(userEmail),
      getFirebaseRequestsByMentor(userEmail),
    ]);
    
    return { sent, received };
  } catch (error) {
    logger.error('Error getting all requests for user from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get requests by status
 */
export async function getFirebaseRequestsByStatus(
  userEmail: string,
  status: 'pending' | 'accepted' | 'declined'
): Promise<MentorshipRequest[]> {
  try {
    const requestsCol = getRequestsCollection();
    
    // Get requests where user is either sender or receiver
    const sentQuery = query(
      requestsCol,
      where('requesterEmail', '==', userEmail),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const receivedQuery = query(
      requestsCol,
      where('mentorEmail', '==', userEmail),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(sentQuery),
      getDocs(receivedQuery),
    ]);
    
    const requests: MentorshipRequest[] = [];
    
    sentSnapshot.forEach((doc) => {
      requests.push(doc.data() as MentorshipRequest);
    });
    
    receivedSnapshot.forEach((doc) => {
      requests.push(doc.data() as MentorshipRequest);
    });
    
    // Sort by createdAt descending
    requests.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    logger.info('Requests by status retrieved from Firestore', { userEmail, status, count: requests.length });
    return requests;
  } catch (error) {
    logger.error('Error getting requests by status from Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Accept a mentorship request
 */
export async function acceptFirebaseRequest(
  requestId: string,
  responseNote?: string
): Promise<void> {
  try {
    await updateFirebaseRequest(requestId, {
      status: 'accepted',
      responseNote: responseNote || '',
      respondedAt: new Date().toISOString(),
    });
    
    logger.info('Request accepted in Firestore', { requestId });
  } catch (error) {
    logger.error('Error accepting request in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Decline a mentorship request
 */
export async function declineFirebaseRequest(
  requestId: string,
  responseNote?: string
): Promise<void> {
  try {
    await updateFirebaseRequest(requestId, {
      status: 'declined',
      responseNote: responseNote || '',
      respondedAt: new Date().toISOString(),
    });
    
    logger.info('Request declined in Firestore', { requestId });
  } catch (error) {
    logger.error('Error declining request in Firestore', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
