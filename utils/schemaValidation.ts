// Schema Validation for Data Storage
// Provides runtime type checking and validation before storing data

import { logger } from './logger';

export interface ProfileSchema {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSchema {
  email: string;
  password?: string;
  id: string;
  createdAt?: string;
  isTestAccount?: boolean;
}

export interface MentorshipRequestSchema {
  id: string;
  requesterEmail: string;
  requesterName: string;
  mentorEmail: string;
  mentorName: string;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  responseNote?: string;
  createdAt: string;
  respondedAt?: string;
}

/**
 * Validates profile data structure
 */
export function validateProfileSchema(data: unknown): data is ProfileSchema {
  if (!data || typeof data !== 'object') {
    logger.warn('Profile validation failed: not an object');
    return false;
  }

  const profile = data as Record<string, unknown>;

  const requiredFields = ['name', 'expertise', 'interest', 'expertiseYears', 'interestYears', 'email', 'phoneNumber'];
  for (const field of requiredFields) {
    if (!(field in profile)) {
      logger.warn(`Profile validation failed: missing field ${field}`);
      return false;
    }
  }

  if (typeof profile.name !== 'string' || profile.name.trim().length === 0) {
    logger.warn('Profile validation failed: invalid name');
    return false;
  }

  if (typeof profile.email !== 'string' || !profile.email.includes('@')) {
    logger.warn('Profile validation failed: invalid email');
    return false;
  }

  if (typeof profile.expertiseYears !== 'number' || profile.expertiseYears < 0) {
    logger.warn('Profile validation failed: invalid expertiseYears');
    return false;
  }

  if (typeof profile.interestYears !== 'number' || profile.interestYears < 0) {
    logger.warn('Profile validation failed: invalid interestYears');
    return false;
  }

  return true;
}

/**
 * Validates user data structure
 */
export function validateUserSchema(data: unknown): data is UserSchema {
  if (!data || typeof data !== 'object') {
    logger.warn('User validation failed: not an object');
    return false;
  }

  const user = data as Record<string, unknown>;

  if (!('email' in user) || typeof user.email !== 'string') {
    logger.warn('User validation failed: invalid email');
    return false;
  }

  if (!('id' in user) || typeof user.id !== 'string') {
    logger.warn('User validation failed: invalid id');
    return false;
  }

  return true;
}

/**
 * Validates mentorship request data structure
 */
export function validateMentorshipRequestSchema(data: unknown): data is MentorshipRequestSchema {
  if (!data || typeof data !== 'object') {
    logger.warn('MentorshipRequest validation failed: not an object');
    return false;
  }

  const request = data as Record<string, unknown>;

  const requiredFields = ['id', 'requesterEmail', 'requesterName', 'mentorEmail', 'mentorName', 'note', 'status', 'createdAt'];
  for (const field of requiredFields) {
    if (!(field in request)) {
      logger.warn(`MentorshipRequest validation failed: missing field ${field}`);
      return false;
    }
  }

  if (!['pending', 'accepted', 'declined'].includes(request.status as string)) {
    logger.warn('MentorshipRequest validation failed: invalid status');
    return false;
  }

  if (typeof request.id !== 'string' || request.id.length === 0) {
    logger.warn('MentorshipRequest validation failed: invalid id');
    return false;
  }

  return true;
}

/**
 * Safely parse JSON with schema validation
 */
export function safeParseJSON<T>(
  jsonString: string,
  validator: (data: unknown) => data is T,
  fallback: T | null = null
): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (validator(parsed)) {
      return parsed;
    }
    logger.warn('JSON validation failed', { jsonString: jsonString.substring(0, 100) });
    return fallback;
  } catch (error) {
    logger.error('JSON parse error', error instanceof Error ? error : new Error(String(error)));
    return fallback;
  }
}
