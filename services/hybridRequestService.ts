/**
 * Hybrid Request Service
 * 
 * Provides a unified request interface that:
 * - Tries Firebase first (if configured)
 * - Falls back to local storage if Firebase fails
 * - Caches Firebase data locally for offline access
 * - Gracefully handles Firebase errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/config/firebase.config';
import {
  createFirebaseRequest,
  getFirebaseRequest,
  updateFirebaseRequest,
  deleteFirebaseRequest,
  getAllFirebaseRequestsForUser,
  getFirebaseRequestsByStatus,
  acceptFirebaseRequest,
  declineFirebaseRequest,
} from './firebaseRequestService';
import {
  getAllRequests as getLocalAllRequests,
  createRequest as createLocalRequest,
  updateRequestStatus as updateLocalRequestStatus,
  getRequestById as getLocalRequestById,
  getAcceptedConnections as getLocalAcceptedConnections,
} from './requestService';
import { MentorshipRequest } from '@/types/types';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/utils/constants';
import { safeParseJSON, validateMentorshipRequestSchema } from '@/utils/schemaValidation';

/**
 * Save requests locally to AsyncStorage
 */
async function saveRequestsLocally(requests: MentorshipRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify(requests));
  } catch (error) {
    logger.error('Error saving requests locally', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all requests (hybrid: Firebase first, then local fallback)
 */
export async function hybridGetAllRequests(): Promise<MentorshipRequest[]> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        // Get all requests from Firebase by querying for all users
        // Since we can't query all requests directly, we'll need to get them by user
        // For now, we'll use a different approach: get from local and sync with Firebase
        // This is a limitation - we need to know user emails to query Firebase
        
        // For now, fall back to local and merge with Firebase data
        // In a production app, you might want to maintain a separate "allRequests" collection
        logger.info('Getting all requests - using local storage with Firebase sync');
      } catch (firebaseError) {
        logger.warn('Failed to get requests from Firebase, using local', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage
    return await getLocalAllRequests();
  } catch (error) {
    logger.error('Error in hybrid get all requests', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all requests for a user (hybrid: Firebase first, then local fallback)
 */
export async function hybridGetAllRequestsForUser(userEmail: string): Promise<{
  sent: MentorshipRequest[];
  received: MentorshipRequest[];
  all: MentorshipRequest[];
}> {
  try {
    let sent: MentorshipRequest[] = [];
    let received: MentorshipRequest[] = [];
    
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const firebaseRequests = await getAllFirebaseRequestsForUser(userEmail);
        sent = firebaseRequests.sent;
        received = firebaseRequests.received;
        
        // Cache locally
        const allLocalRequests = await getLocalAllRequests();
        const allRequests = [...allLocalRequests];
        
        // Merge Firebase requests with local (avoid duplicates)
        const existingIds = new Set(allRequests.map(r => r.id));
        [...sent, ...received].forEach(request => {
          if (!existingIds.has(request.id)) {
            allRequests.push(request);
          } else {
            // Update existing request with Firebase data
            const index = allRequests.findIndex(r => r.id === request.id);
            if (index !== -1) {
              allRequests[index] = request;
            }
          }
        });
        
        await saveRequestsLocally(allRequests);
        
        logger.info('Requests for user retrieved from Firebase', { 
          userEmail, 
          sentCount: sent.length, 
          receivedCount: received.length 
        });
      } catch (firebaseError) {
        logger.warn('Failed to get requests from Firebase, using local', {
          userEmail,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // If Firebase didn't return data, use local (case-insensitive match)
    if (sent.length === 0 && received.length === 0) {
      const norm = (userEmail || '').trim().toLowerCase();
      const allLocalRequests = await getLocalAllRequests();
      sent = allLocalRequests.filter(r => (r.requesterEmail || '').trim().toLowerCase() === norm);
      received = allLocalRequests.filter(r => (r.mentorEmail || '').trim().toLowerCase() === norm);
    }
    
    const all = [...sent, ...received];
    
    return { sent, received, all };
  } catch (error) {
    logger.error('Error in hybrid get requests for user', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get requests by status (hybrid: Firebase first, then local fallback)
 */
export async function hybridGetRequestsByStatus(
  userEmail: string,
  status: 'pending' | 'accepted' | 'declined'
): Promise<MentorshipRequest[]> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const requests = await getFirebaseRequestsByStatus(userEmail, status);
        
        // Cache locally
        const allLocalRequests = await getLocalAllRequests();
        const allRequests = [...allLocalRequests];
        
        // Merge Firebase requests with local
        const existingIds = new Set(allRequests.map(r => r.id));
        requests.forEach(request => {
          if (!existingIds.has(request.id)) {
            allRequests.push(request);
          } else {
            const index = allRequests.findIndex(r => r.id === request.id);
            if (index !== -1) {
              allRequests[index] = request;
            }
          }
        });
        
        await saveRequestsLocally(allRequests);
        
        logger.info('Requests by status retrieved from Firebase', { userEmail, status, count: requests.length });
        return requests;
      } catch (firebaseError) {
        logger.warn('Failed to get requests by status from Firebase, using local', {
          userEmail,
          status,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage (case-insensitive match)
    const norm = (userEmail || '').trim().toLowerCase();
    const allRequests = await getLocalAllRequests();
    return allRequests.filter(
      r => ((r.requesterEmail || '').trim().toLowerCase() === norm || (r.mentorEmail || '').trim().toLowerCase() === norm) && r.status === status
    );
  } catch (error) {
    logger.error('Error in hybrid get requests by status', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Create a request (hybrid: local + Firebase)
 */
export async function hybridCreateRequest(request: MentorshipRequest): Promise<void> {
  try {
    // Always save locally first
    await createLocalRequest(request);
    logger.info('Request saved locally', { requestId: request.id });
    
    // Try to sync to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        await createFirebaseRequest(request);
        logger.info('Request synced to Firebase', { requestId: request.id });
      } catch (firebaseError) {
        // Log but don't fail - local request is already saved
        logger.warn('Failed to sync request to Firebase, continuing with local only', {
          requestId: request.id,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    } else {
      logger.info('Firebase not configured, request saved locally only', { requestId: request.id });
    }
  } catch (error) {
    logger.error('Error in hybrid create request', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update request status (hybrid: local + Firebase)
 */
export async function hybridUpdateRequestStatus(
  requestId: string,
  status: 'accepted' | 'declined',
  responseNote?: string
): Promise<void> {
  try {
    // Always update locally first
    await updateLocalRequestStatus(requestId, status, responseNote);
    logger.info('Request status updated locally', { requestId, status });
    
    // Try to sync to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        if (status === 'accepted') {
          await acceptFirebaseRequest(requestId, responseNote);
        } else {
          await declineFirebaseRequest(requestId, responseNote);
        }
        logger.info('Request status synced to Firebase', { requestId, status });
      } catch (firebaseError) {
        // Log but don't fail - local update is already done
        logger.warn('Failed to sync request status to Firebase, continuing with local only', {
          requestId,
          status,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    } else {
      logger.info('Firebase not configured, request status updated locally only', { requestId, status });
    }
  } catch (error) {
    logger.error('Error in hybrid update request status', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get a request by ID (hybrid: Firebase first, then local fallback)
 */
export async function hybridGetRequestById(requestId: string): Promise<MentorshipRequest | null> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const request = await getFirebaseRequest(requestId);
        if (request) {
          // Cache locally
          const allRequests = await getLocalAllRequests();
          const existingIndex = allRequests.findIndex(r => r.id === requestId);
          if (existingIndex !== -1) {
            allRequests[existingIndex] = request;
          } else {
            allRequests.push(request);
          }
          await saveRequestsLocally(allRequests);
          
          logger.info('Request retrieved from Firebase', { requestId });
          return request;
        }
      } catch (firebaseError) {
        logger.warn('Failed to get request from Firebase, using local', {
          requestId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage
    return await getLocalRequestById(requestId);
  } catch (error) {
    logger.error('Error in hybrid get request by ID', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get accepted connections (hybrid: Firebase first, then local fallback)
 */
export async function hybridGetAcceptedConnections(userEmail: string): Promise<{
  mentors: MentorshipRequest[];
  mentees: MentorshipRequest[];
}> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const acceptedRequests = await getFirebaseRequestsByStatus(userEmail, 'accepted');
        
        const mentors = acceptedRequests.filter(r => r.requesterEmail === userEmail);
        const mentees = acceptedRequests.filter(r => r.mentorEmail === userEmail);
        
        logger.info('Accepted connections retrieved from Firebase', { 
          userEmail, 
          mentorsCount: mentors.length, 
          menteesCount: mentees.length 
        });
        
        return { mentors, mentees };
      } catch (firebaseError) {
        logger.warn('Failed to get accepted connections from Firebase, using local', {
          userEmail,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage
    return await getLocalAcceptedConnections(userEmail);
  } catch (error) {
    logger.error('Error in hybrid get accepted connections', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check if Firebase sync is available
 */
export function isFirebaseSyncAvailable(): boolean {
  return isFirebaseConfigured();
}
