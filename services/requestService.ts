// Mentorship Request Service Layer
// Separates business logic from UI components for request operations

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { safeParseJSON, validateMentorshipRequestSchema } from '../utils/schemaValidation';
import { STORAGE_KEYS } from '../utils/constants';
import { MentorshipRequest } from '../types/types';

/**
 * Get all mentorship requests from storage
 * 
 * @returns {Promise<MentorshipRequest[]>} Array of all mentorship requests
 */
export async function getAllRequests(): Promise<MentorshipRequest[]> {
  try {
    const requestsData = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
    if (!requestsData) {
      return [];
    }
    return safeParseJSON(
      requestsData,
      (data): data is MentorshipRequest[] => Array.isArray(data) && data.every(validateMentorshipRequestSchema),
      []
    ) || [];
  } catch (error) {
    logger.error('Error getting all requests', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get requests filtered by user email
 * 
 * Categorizes requests into incoming, outgoing, and processed based on
 * the user's role (mentor or requester) and request status.
 * 
 * @param {string} userEmail - Email of the user to filter requests for
 * @returns {Promise<{incoming: MentorshipRequest[], outgoing: MentorshipRequest[], processed: MentorshipRequest[]}>}
 *   Object containing categorized requests
 */
export async function getRequestsByUser(userEmail: string): Promise<{
  incoming: MentorshipRequest[];
  outgoing: MentorshipRequest[];
  processed: MentorshipRequest[];
}> {
  try {
    const allRequests = await getAllRequests();

    const incoming = allRequests.filter(
      req => req.mentorEmail === userEmail && req.status === 'pending'
    );

    const outgoing = allRequests.filter(
      req => req.requesterEmail === userEmail && req.status === 'pending'
    );

    const processed = allRequests.filter(
      req => (req.requesterEmail === userEmail || req.mentorEmail === userEmail) &&
             (req.status === 'accepted' || req.status === 'declined')
    );

    return { incoming, outgoing, processed };
  } catch (error) {
    logger.error('Error getting requests by user', error instanceof Error ? error : new Error(String(error)), { userEmail });
    return { incoming: [], outgoing: [], processed: [] };
  }
}

/**
 * Create a new mentorship request
 * 
 * Validates the request and prevents duplicate pending requests
 * between the same requester and mentor.
 * 
 * @param {MentorshipRequest} request - The mentorship request to create
 * @throws {Error} If request is invalid or duplicate exists
 */
export async function createRequest(request: MentorshipRequest): Promise<void> {
  try {
    // Validate request before saving
    if (!validateMentorshipRequestSchema(request)) {
      throw new Error('Invalid request data');
    }

    const allRequests = await getAllRequests();
    
    // Check for duplicate request
    const duplicate = allRequests.find(
      req => req.requesterEmail === request.requesterEmail &&
             req.mentorEmail === request.mentorEmail &&
             req.status === 'pending'
    );

    if (duplicate) {
      throw new Error('A pending request already exists between these users');
    }

    allRequests.push(request);
    await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify(allRequests));

    logger.info('Request created successfully', { 
      id: request.id, 
      requester: request.requesterEmail,
      mentor: request.mentorEmail 
    });
  } catch (error) {
    logger.error('Error creating request', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update request status (accept/decline)
 * 
 * Updates the status of a mentorship request and optionally adds a response note.
 * 
 * @param {string} requestId - ID of the request to update
 * @param {'accepted' | 'declined'} status - New status for the request
 * @param {string} [responseNote] - Optional note from the mentor
 * @throws {Error} If request not found or update fails
 */
export async function updateRequestStatus(
  requestId: string,
  status: 'accepted' | 'declined',
  responseNote?: string
): Promise<void> {
  try {
    const allRequests = await getAllRequests();
    const requestIndex = allRequests.findIndex(req => req.id === requestId);

    if (requestIndex === -1) {
      throw new Error('Request not found');
    }

    allRequests[requestIndex] = {
      ...allRequests[requestIndex],
      status,
      responseNote: responseNote?.trim() || undefined,
      respondedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify(allRequests));

    logger.info('Request status updated', { requestId, status });
  } catch (error) {
    logger.error('Error updating request status', error instanceof Error ? error : new Error(String(error)), { requestId, status });
    throw error;
  }
}

/**
 * Get a specific request by its ID
 * 
 * @param {string} requestId - ID of the request to retrieve
 * @returns {Promise<MentorshipRequest | null>} Request matching the ID or null if not found
 */
export async function getRequestById(requestId: string): Promise<MentorshipRequest | null> {
  try {
    const allRequests = await getAllRequests();
    return allRequests.find(req => req.id === requestId) || null;
  } catch (error) {
    logger.error('Error getting request by ID', error instanceof Error ? error : new Error(String(error)), { requestId });
    return null;
  }
}

/**
 * Get accepted connections for a user
 * 
 * Returns all accepted mentorship requests where the user is either
 * the mentor (mentees) or the requester (mentors).
 * 
 * @param {string} userEmail - Email of the user
 * @returns {Promise<{mentors: MentorshipRequest[], mentees: MentorshipRequest[]}>}
 *   Object containing mentors (where user is mentee) and mentees (where user is mentor)
 */
export async function getAcceptedConnections(userEmail: string): Promise<{
  mentors: MentorshipRequest[];
  mentees: MentorshipRequest[];
}> {
  try {
    const allRequests = await getAllRequests();
    const acceptedRequests = allRequests.filter(req => req.status === 'accepted');

    const mentors = acceptedRequests.filter(req => req.requesterEmail === userEmail);
    const mentees = acceptedRequests.filter(req => req.mentorEmail === userEmail);

    return { mentors, mentees };
  } catch (error) {
    logger.error('Error getting accepted connections', error instanceof Error ? error : new Error(String(error)), { userEmail });
    return { mentors: [], mentees: [] };
  }
}
