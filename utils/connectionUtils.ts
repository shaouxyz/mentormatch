/**
 * Connection Utilities
 * 
 * Helper functions for checking mentorship connections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MentorshipRequest } from '@/types/types';
import { safeParseJSON, validateMentorshipRequestSchema } from '@/utils/schemaValidation';
import { logger } from '@/utils/logger';

/**
 * Check if two users have an accepted mentorship connection
 * 
 * @param {string} user1Email - First user's email
 * @param {string} user2Email - Second user's email
 * @returns {Promise<boolean>} True if they have an accepted connection
 */
export async function areUsersMatched(user1Email: string, user2Email: string): Promise<boolean> {
  try {
    const requestsData = await AsyncStorage.getItem('mentorshipRequests');
    if (!requestsData) {
      return false;
    }

    const allRequests = safeParseJSON<MentorshipRequest[]>(
      requestsData,
      (data): data is MentorshipRequest[] => {
        if (!Array.isArray(data)) return false;
        return data.every(req => validateMentorshipRequestSchema(req));
      },
      []
    ) || [];

    // Check if there's an accepted request between these two users
    const matched = allRequests.some(req => {
      if (req.status !== 'accepted') return false;
      
      // Check both directions: user1 -> user2 or user2 -> user1
      return (
        (req.requesterEmail === user1Email && req.mentorEmail === user2Email) ||
        (req.requesterEmail === user2Email && req.mentorEmail === user1Email)
      );
    });

    return matched;
  } catch (error) {
    logger.error('Error checking if users are matched', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get all matched user emails for a given user
 * 
 * @param {string} userEmail - User's email
 * @returns {Promise<string[]>} Array of matched user emails
 */
export async function getMatchedUserEmails(userEmail: string): Promise<string[]> {
  try {
    const requestsData = await AsyncStorage.getItem('mentorshipRequests');
    if (!requestsData) {
      return [];
    }

    const allRequests = safeParseJSON<MentorshipRequest[]>(
      requestsData,
      (data): data is MentorshipRequest[] => {
        if (!Array.isArray(data)) return false;
        return data.every(req => validateMentorshipRequestSchema(req));
      },
      []
    ) || [];

    const acceptedRequests = allRequests.filter(req => req.status === 'accepted');
    const matchedEmails = new Set<string>();

    acceptedRequests.forEach(req => {
      if (req.requesterEmail === userEmail) {
        matchedEmails.add(req.mentorEmail);
      } else if (req.mentorEmail === userEmail) {
        matchedEmails.add(req.requesterEmail);
      }
    });

    return Array.from(matchedEmails);
  } catch (error) {
    logger.error('Error getting matched user emails', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
