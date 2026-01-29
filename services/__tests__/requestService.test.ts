/**
 * Request Service Tests
 * 
 * Tests for services/requestService.ts - mentorship request service layer
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllRequests,
  getRequestsByUser,
  createRequest,
  updateRequestStatus,
  getRequestById,
  getAcceptedConnections,
} from '../requestService';
import { STORAGE_KEYS } from '../../utils/constants';
import { MentorshipRequest } from '../../types/types';
import * as logger from '../../utils/logger';
import * as schemaValidation from '../../utils/schemaValidation';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../utils/schemaValidation');

const mockLogger = logger as any;
const mockSchemaValidation = schemaValidation as any;

describe('Request Service', () => {
  const mockRequest: MentorshipRequest = {
    id: 'req1',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    mentorEmail: 'mentor@example.com',
    mentorName: 'Mentor',
    status: 'pending',
    message: 'Please mentor me',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockSchemaValidation.validateMentorshipRequestSchema.mockReturnValue(true);
    mockSchemaValidation.safeParseJSON.mockImplementation((data, validator, defaultValue) => {
      if (!data) return defaultValue;
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.every(validator) ? parsed : defaultValue;
        }
        return validator(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    });
  });

  describe('getAllRequests', () => {
    it('should return empty array when no requests exist', async () => {
      const requests = await getAllRequests();
      expect(requests).toEqual([]);
    });

    it('should return all requests when requests exist', async () => {
      const requests = [mockRequest];
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify(requests));
      mockSchemaValidation.safeParseJSON.mockReturnValue(requests);
      
      const result = await getAllRequests();
      expect(result).toEqual(requests);
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const requests = await getAllRequests();
      expect(requests).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('getRequestsByUser', () => {
    it('should categorize requests correctly', async () => {
      const requests: MentorshipRequest[] = [
        { ...mockRequest, id: 'req1', requesterEmail: 'user@example.com', mentorEmail: 'mentor1@example.com', status: 'pending' },
        { ...mockRequest, id: 'req2', requesterEmail: 'mentor1@example.com', mentorEmail: 'user@example.com', status: 'pending' },
        { ...mockRequest, id: 'req3', requesterEmail: 'user@example.com', mentorEmail: 'mentor2@example.com', status: 'accepted' },
        { ...mockRequest, id: 'req4', requesterEmail: 'user@example.com', mentorEmail: 'mentor3@example.com', status: 'declined' },
      ];
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify(requests));
      mockSchemaValidation.safeParseJSON.mockReturnValue(requests);
      
      const result = await getRequestsByUser('user@example.com');
      
      expect(result.incoming).toHaveLength(1);
      expect(result.incoming[0].id).toBe('req2');
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].id).toBe('req1');
      expect(result.processed).toHaveLength(2);
    });

    it('should return empty arrays when no requests exist', async () => {
      const result = await getRequestsByUser('user@example.com');
      expect(result.incoming).toEqual([]);
      expect(result.outgoing).toEqual([]);
      expect(result.processed).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const result = await getRequestsByUser('user@example.com');
      expect(result.incoming).toEqual([]);
      expect(result.outgoing).toEqual([]);
      expect(result.processed).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getRequestsByUser', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const result = await getRequestsByUser('user@example.com');
      expect(result.incoming).toEqual([]);
      expect(result.outgoing).toEqual([]);
      expect(result.processed).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('createRequest', () => {
    it('should create request successfully', async () => {
      await createRequest(mockRequest);
      
      const requestsData = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      expect(requestsData).toBeTruthy();
      const requests = JSON.parse(requestsData || '[]');
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe(mockRequest.id);
    });

    it('should throw error when request is invalid', async () => {
      mockSchemaValidation.validateMentorshipRequestSchema.mockReturnValue(false);
      
      await expect(createRequest(mockRequest)).rejects.toThrow('Invalid request data');
    });

    it('should throw error when duplicate pending request exists', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([mockRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockRequest]);
      
      await expect(createRequest(mockRequest)).rejects.toThrow('A pending request already exists');
    });

    it('should allow creating request when existing request is accepted', async () => {
      const acceptedRequest = { ...mockRequest, status: 'accepted' as const };
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([acceptedRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([acceptedRequest]);
      
      await createRequest(mockRequest);
      
      const requestsData = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(requestsData || '[]');
      expect(requests).toHaveLength(2);
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(createRequest(mockRequest)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in createRequest', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(createRequest(mockRequest)).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('updateRequestStatus', () => {
    it('should update request status successfully', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([mockRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockRequest]);
      
      await updateRequestStatus('req1', 'accepted', 'Welcome!');
      
      const requestsData = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0].status).toBe('accepted');
      expect(requests[0].responseNote).toBe('Welcome!');
      expect(requests[0].respondedAt).toBeTruthy();
    });

    it('should update without response note', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([mockRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockRequest]);
      
      await updateRequestStatus('req1', 'declined');
      
      const requestsData = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0].status).toBe('declined');
      expect(requests[0].responseNote).toBeUndefined();
    });

    it('should trim response note', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([mockRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockRequest]);
      
      await updateRequestStatus('req1', 'accepted', '  Welcome!  ');
      
      const requestsData = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0].responseNote).toBe('Welcome!');
    });

    it('should throw error when request not found', async () => {
      await expect(updateRequestStatus('nonexistent', 'accepted')).rejects.toThrow('Request not found');
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(updateRequestStatus('req1', 'accepted')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in updateRequestStatus', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([mockRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockRequest]);
      
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');
      
      await expect(updateRequestStatus('req1', 'accepted')).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('getRequestById', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      mockSchemaValidation.safeParseJSON.mockImplementation((data, validator, defaultValue) => {
        if (!data) return defaultValue;
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed.every(validator) ? parsed : defaultValue;
          }
          return validator(parsed) ? parsed : defaultValue;
        } catch {
          return defaultValue;
        }
      });
    });

    it('should return null when request not found', async () => {
      const request = await getRequestById('nonexistent');
      expect(request).toBeNull();
    });

    it('should return request when found', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify([mockRequest]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockRequest]);
      
      const request = await getRequestById('req1');
      expect(request).toEqual(mockRequest);
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const request = await getRequestById('req1');
      expect(request).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getRequestById', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const request = await getRequestById('req1');
      expect(request).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('getAcceptedConnections', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      mockSchemaValidation.safeParseJSON.mockImplementation((data, validator, defaultValue) => {
        if (!data) return defaultValue;
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed.every(validator) ? parsed : defaultValue;
          }
          return validator(parsed) ? parsed : defaultValue;
        } catch {
          return defaultValue;
        }
      });
    });

    it('should return mentors and mentees correctly', async () => {
      const requests: MentorshipRequest[] = [
        { ...mockRequest, id: 'req1', requesterEmail: 'user@example.com', mentorEmail: 'mentor1@example.com', status: 'accepted' },
        { ...mockRequest, id: 'req2', requesterEmail: 'mentor1@example.com', mentorEmail: 'user@example.com', status: 'accepted' },
        { ...mockRequest, id: 'req3', requesterEmail: 'user@example.com', mentorEmail: 'mentor2@example.com', status: 'pending' },
      ];
      await AsyncStorage.setItem(STORAGE_KEYS.MENTORSHIP_REQUESTS, JSON.stringify(requests));
      mockSchemaValidation.safeParseJSON.mockReturnValue(requests);
      
      const result = await getAcceptedConnections('user@example.com');
      
      expect(result.mentors).toHaveLength(1);
      expect(result.mentors[0].id).toBe('req1');
      expect(result.mentees).toHaveLength(1);
      expect(result.mentees[0].id).toBe('req2');
    });

    it('should return empty arrays when no accepted connections', async () => {
      const result = await getAcceptedConnections('user@example.com');
      expect(result.mentors).toEqual([]);
      expect(result.mentees).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const result = await getAcceptedConnections('user@example.com');
      expect(result.mentors).toEqual([]);
      expect(result.mentees).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getAcceptedConnections', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const result = await getAcceptedConnections('user@example.com');
      expect(result.mentors).toEqual([]);
      expect(result.mentees).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('getAllRequests', () => {
    it('should handle non-Error thrown in getAllRequests', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const result = await getAllRequests();
      expect(result).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });
});
