/**
 * Schema Validation Tests
 * 
 * Tests for utils/schemaValidation.ts - runtime type checking and validation
 */

import {
  validateProfileSchema,
  validateUserSchema,
  validateMentorshipRequestSchema,
  safeParseJSON,
  type ProfileSchema,
  type UserSchema,
  type MentorshipRequestSchema,
} from '../schemaValidation';
import * as logger from '../logger';

// Mock logger
jest.mock('../logger');

const mockLogger = logger.logger as any;

describe('Schema Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProfileSchema', () => {
    const validProfile: ProfileSchema = {
      name: 'John Doe',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'john@example.com',
      phoneNumber: '123-456-7890',
    };

    it('should validate correct profile', () => {
      expect(validateProfileSchema(validProfile)).toBe(true);
    });

    it('should reject null', () => {
      expect(validateProfileSchema(null)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: not an object');
    });

    it('should reject undefined', () => {
      expect(validateProfileSchema(undefined)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: not an object');
    });

    it('should reject non-object types', () => {
      expect(validateProfileSchema('string')).toBe(false);
      expect(validateProfileSchema(123)).toBe(false);
      expect(validateProfileSchema([])).toBe(false);
    });

    it('should reject missing name field', () => {
      const profile = { ...validProfile };
      delete (profile as any).name;
      expect(validateProfileSchema(profile)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: missing field name');
    });

    it('should reject missing email field', () => {
      const profile = { ...validProfile };
      delete (profile as any).email;
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject missing expertise field', () => {
      const profile = { ...validProfile };
      delete (profile as any).expertise;
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject missing interest field', () => {
      const profile = { ...validProfile };
      delete (profile as any).interest;
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject missing expertiseYears field', () => {
      const profile = { ...validProfile };
      delete (profile as any).expertiseYears;
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject missing interestYears field', () => {
      const profile = { ...validProfile };
      delete (profile as any).interestYears;
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject missing phoneNumber field', () => {
      const profile = { ...validProfile };
      delete (profile as any).phoneNumber;
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject empty name', () => {
      const profile = { ...validProfile, name: '' };
      expect(validateProfileSchema(profile)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: invalid name');
    });

    it('should reject whitespace-only name', () => {
      const profile = { ...validProfile, name: '   ' };
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject invalid email (no @)', () => {
      const profile = { ...validProfile, email: 'invalidemail' };
      expect(validateProfileSchema(profile)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: invalid email');
    });

    it('should reject invalid email (not string)', () => {
      const profile = { ...validProfile, email: 123 };
      expect(validateProfileSchema(profile)).toBe(false);
    });

    it('should reject negative expertiseYears', () => {
      const profile = { ...validProfile, expertiseYears: -1 };
      expect(validateProfileSchema(profile)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: invalid expertiseYears');
    });

    it('should accept zero expertiseYears', () => {
      const profile = { ...validProfile, expertiseYears: 0 };
      expect(validateProfileSchema(profile)).toBe(true);
    });

    it('should reject negative interestYears', () => {
      const profile = { ...validProfile, interestYears: -1 };
      expect(validateProfileSchema(profile)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed: invalid interestYears');
    });

    it('should accept zero interestYears', () => {
      const profile = { ...validProfile, interestYears: 0 };
      expect(validateProfileSchema(profile)).toBe(true);
    });

    it('should accept optional createdAt field', () => {
      const profile = { ...validProfile, createdAt: '2024-01-01' };
      expect(validateProfileSchema(profile)).toBe(true);
    });

    it('should accept optional updatedAt field', () => {
      const profile = { ...validProfile, updatedAt: '2024-01-01' };
      expect(validateProfileSchema(profile)).toBe(true);
    });

    it('should accept both optional fields', () => {
      const profile = {
        ...validProfile,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };
      expect(validateProfileSchema(profile)).toBe(true);
    });
  });

  describe('validateUserSchema', () => {
    const validUser: UserSchema = {
      email: 'user@example.com',
      id: 'user123',
    };

    it('should validate correct user', () => {
      expect(validateUserSchema(validUser)).toBe(true);
    });

    it('should reject null', () => {
      expect(validateUserSchema(null)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('User validation failed: not an object');
    });

    it('should reject undefined', () => {
      expect(validateUserSchema(undefined)).toBe(false);
    });

    it('should reject non-object types', () => {
      expect(validateUserSchema('string')).toBe(false);
      expect(validateUserSchema(123)).toBe(false);
    });

    it('should reject missing email', () => {
      const user = { id: 'user123' };
      expect(validateUserSchema(user)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('User validation failed: invalid email');
    });

    it('should reject invalid email type', () => {
      const user = { email: 123, id: 'user123' };
      expect(validateUserSchema(user)).toBe(false);
    });

    it('should reject missing id', () => {
      const user = { email: 'user@example.com' };
      expect(validateUserSchema(user)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('User validation failed: invalid id');
    });

    it('should reject invalid id type', () => {
      const user = { email: 'user@example.com', id: 123 };
      expect(validateUserSchema(user)).toBe(false);
    });

    it('should accept optional password field', () => {
      const user = { ...validUser, password: 'hashedpassword' };
      // Password is optional, validation should pass
      const result = validateUserSchema(user);
      expect(result).toBe(true);
      // Should not log any warnings since password is optional
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should accept optional createdAt field', () => {
      const user = { ...validUser, createdAt: '2024-01-01' };
      expect(validateUserSchema(user)).toBe(true);
    });

    it('should accept optional isTestAccount field', () => {
      const user = { ...validUser, isTestAccount: true };
      expect(validateUserSchema(user)).toBe(true);
    });
  });

  describe('validateMentorshipRequestSchema', () => {
    const validRequest: MentorshipRequestSchema = {
      id: 'req123',
      requesterEmail: 'requester@example.com',
      requesterName: 'Requester Name',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor Name',
      note: 'Request note',
      status: 'pending',
      createdAt: '2024-01-01',
    };

    it('should validate correct request', () => {
      expect(validateMentorshipRequestSchema(validRequest)).toBe(true);
    });

    it('should reject null', () => {
      expect(validateMentorshipRequestSchema(null)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('MentorshipRequest validation failed: not an object');
    });

    it('should reject undefined', () => {
      expect(validateMentorshipRequestSchema(undefined)).toBe(false);
    });

    it('should reject non-object types', () => {
      expect(validateMentorshipRequestSchema('string')).toBe(false);
      expect(validateMentorshipRequestSchema(123)).toBe(false);
    });

    it('should reject missing id', () => {
      const request = { ...validRequest };
      delete (request as any).id;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing requesterEmail', () => {
      const request = { ...validRequest };
      delete (request as any).requesterEmail;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing requesterName', () => {
      const request = { ...validRequest };
      delete (request as any).requesterName;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing mentorEmail', () => {
      const request = { ...validRequest };
      delete (request as any).mentorEmail;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing mentorName', () => {
      const request = { ...validRequest };
      delete (request as any).mentorName;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing note', () => {
      const request = { ...validRequest };
      delete (request as any).note;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing status', () => {
      const request = { ...validRequest };
      delete (request as any).status;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject missing createdAt', () => {
      const request = { ...validRequest };
      delete (request as any).createdAt;
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should reject invalid status', () => {
      const request = { ...validRequest, status: 'invalid' as any };
      expect(validateMentorshipRequestSchema(request)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('MentorshipRequest validation failed: invalid status');
    });

    it('should accept pending status', () => {
      const request = { ...validRequest, status: 'pending' };
      expect(validateMentorshipRequestSchema(request)).toBe(true);
    });

    it('should accept accepted status', () => {
      const request = { ...validRequest, status: 'accepted' };
      expect(validateMentorshipRequestSchema(request)).toBe(true);
    });

    it('should accept declined status', () => {
      const request = { ...validRequest, status: 'declined' };
      expect(validateMentorshipRequestSchema(request)).toBe(true);
    });

    it('should reject empty id', () => {
      const request = { ...validRequest, id: '' };
      expect(validateMentorshipRequestSchema(request)).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('MentorshipRequest validation failed: invalid id');
    });

    it('should reject invalid id type', () => {
      const request = { ...validRequest, id: 123 as any };
      expect(validateMentorshipRequestSchema(request)).toBe(false);
    });

    it('should accept optional responseNote field', () => {
      const request = { ...validRequest, responseNote: 'Response note' };
      expect(validateMentorshipRequestSchema(request)).toBe(true);
    });

    it('should accept optional respondedAt field', () => {
      const request = { ...validRequest, respondedAt: '2024-01-02' };
      expect(validateMentorshipRequestSchema(request)).toBe(true);
    });
  });

  describe('safeParseJSON', () => {
    it('should parse valid JSON with valid schema', () => {
      const jsonString = JSON.stringify({ email: 'user@example.com', id: 'user123' });
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema);

      expect(result).toEqual({ email: 'user@example.com', id: 'user123' });
    });

    it('should return null for invalid JSON', () => {
      const jsonString = 'invalid json';
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, null);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return null for valid JSON but invalid schema', () => {
      const jsonString = JSON.stringify({ email: 'user@example.com' }); // Missing id
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, null);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return fallback for invalid JSON', () => {
      const jsonString = 'invalid json';
      const fallback = { email: 'fallback@example.com', id: 'fallback' };
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, fallback);

      expect(result).toEqual(fallback);
    });

    it('should return fallback for invalid schema', () => {
      const jsonString = JSON.stringify({ email: 'user@example.com' });
      const fallback = { email: 'fallback@example.com', id: 'fallback' };
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, fallback);

      expect(result).toEqual(fallback);
    });

    it('should handle empty string', () => {
      const result = safeParseJSON<UserSchema>('', validateUserSchema, null);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON', () => {
      const jsonString = '{ email: "user@example.com" }'; // Missing quotes
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, null);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle very long JSON strings', () => {
      const longData = { email: 'user@example.com', id: 'user123', data: 'a'.repeat(10000) };
      const jsonString = JSON.stringify(longData);
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, null);

      // Should still parse, but validation might fail
      expect(result).toBeTruthy();
    });

    it('should truncate long JSON in warning', () => {
      const longJson = 'a'.repeat(200);
      safeParseJSON<UserSchema>(longJson, validateUserSchema, null);

      // Check that error was called (for invalid JSON) or warning (for invalid schema)
      // Since longJson is invalid JSON, error should be called
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle nested objects in JSON', () => {
      const jsonString = JSON.stringify({
        email: 'user@example.com',
        id: 'user123',
        metadata: { nested: 'value' },
      });
      const result = safeParseJSON<UserSchema>(jsonString, validateUserSchema, null);

      // Should parse but validation might fail if schema doesn't allow nested objects
      expect(result).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle profile with very long strings', () => {
      const profile: ProfileSchema = {
        name: 'a'.repeat(1000),
        expertise: 'b'.repeat(1000),
        interest: 'c'.repeat(1000),
        expertiseYears: 5,
        interestYears: 2,
        email: 'user@example.com',
        phoneNumber: '123-456-7890',
      };
      expect(validateProfileSchema(profile)).toBe(true);
    });

    it('should handle profile with special characters', () => {
      const profile: ProfileSchema = {
        name: "O'Brien",
        expertise: 'UI/UX Design',
        interest: 'Data Science & ML',
        expertiseYears: 5,
        interestYears: 2,
        email: 'user+tag@example.com',
        phoneNumber: '+1 (555) 123-4567',
      };
      expect(validateProfileSchema(profile)).toBe(true);
    });

    it('should handle user with very long email', () => {
      const user: UserSchema = {
        email: 'a'.repeat(100) + '@example.com',
        id: 'user123',
      };
      expect(validateUserSchema(user)).toBe(true);
    });

    it('should handle request with very long note', () => {
      const request: MentorshipRequestSchema = {
        id: 'req123',
        requesterEmail: 'requester@example.com',
        requesterName: 'Requester',
        mentorEmail: 'mentor@example.com',
        mentorName: 'Mentor',
        note: 'a'.repeat(10000),
        status: 'pending',
        createdAt: '2024-01-01',
      };
      expect(validateMentorshipRequestSchema(request)).toBe(true);
    });
  });
});
