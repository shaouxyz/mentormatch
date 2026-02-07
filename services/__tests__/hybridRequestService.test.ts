/**
 * Hybrid Request Service tests (TEST_PLAN Section 26.19.5)
 * - Get requests: Firebase first then local fallback; correct filtering
 * - Update status: local update and Firebase sync; decline path
 * - Error handling when Firebase unavailable or fails
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hybridGetAllRequestsForUser,
  hybridUpdateRequestStatus,
  hybridGetRequestsByStatus,
  hybridGetRequestById,
  isFirebaseSyncAvailable,
} from '../hybridRequestService';
import * as firebaseConfig from '../../config/firebase.config';
import * as firebaseRequestService from '../firebaseRequestService';
import { STORAGE_KEYS } from '../../utils/constants';
import { MentorshipRequest } from '../../types/types';

jest.mock('../../config/firebase.config');
jest.mock('../firebaseRequestService', () => ({
  createFirebaseRequest: jest.fn(),
  getFirebaseRequest: jest.fn(),
  updateFirebaseRequest: jest.fn(),
  deleteFirebaseRequest: jest.fn(),
  getFirebaseRequestsBySender: jest.fn(),
  getFirebaseRequestsByMentor: jest.fn(),
  getAllFirebaseRequestsForUser: jest.fn(),
  getFirebaseRequestsByStatus: jest.fn(),
  acceptFirebaseRequest: jest.fn(),
  declineFirebaseRequest: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const mockFirebaseConfig = firebaseConfig as jest.Mocked<typeof firebaseConfig>;
const mockFirebaseRequestService = firebaseRequestService as jest.Mocked<typeof firebaseRequestService>;

const mockRequest: MentorshipRequest = {
  id: 'req1',
  requesterEmail: 'requester@example.com',
  requesterName: 'Requester',
  mentorEmail: 'mentor@example.com',
  mentorName: 'Mentor',
  note: 'Note',
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('Hybrid Request Service (Section 26.19.5)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(false);
  });

  describe('hybridGetAllRequestsForUser', () => {
    it('should return local requests when Firebase is not configured', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([
          { ...mockRequest, id: 'r1', requesterEmail: 'user@example.com', mentorEmail: 'm1@example.com' },
          { ...mockRequest, id: 'r2', requesterEmail: 'm2@example.com', mentorEmail: 'user@example.com' },
        ])
      );

      const result = await hybridGetAllRequestsForUser('user@example.com');

      expect(result.sent).toHaveLength(1);
      expect(result.sent[0].requesterEmail).toBe('user@example.com');
      expect(result.received).toHaveLength(1);
      expect(result.received[0].mentorEmail).toBe('user@example.com');
      expect(result.all).toHaveLength(2);
      expect(mockFirebaseRequestService.getAllFirebaseRequestsForUser).not.toHaveBeenCalled();
    });

    it('should use Firebase when configured and return merged data', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseRequestService.getAllFirebaseRequestsForUser.mockResolvedValue({
        sent: [{ ...mockRequest, id: 'f1', requesterEmail: 'user@example.com', mentorEmail: 'mentor@example.com' }],
        received: [],
      });

      const result = await hybridGetAllRequestsForUser('user@example.com');

      expect(mockFirebaseRequestService.getAllFirebaseRequestsForUser).toHaveBeenCalledWith('user@example.com');
      expect(result.sent).toHaveLength(1);
      expect(result.sent[0].id).toBe('f1');
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseRequestService.getAllFirebaseRequestsForUser.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([{ ...mockRequest, id: 'local1', requesterEmail: 'user@example.com', mentorEmail: 'other@example.com' }])
      );

      const result = await hybridGetAllRequestsForUser('user@example.com');

      expect(result.sent).toHaveLength(1);
      expect(result.sent[0].id).toBe('local1');
    });
  });

  describe('hybridUpdateRequestStatus', () => {
    it('should update local request status when Firebase not configured', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([{ ...mockRequest, id: 'req1', status: 'pending' }])
      );

      await hybridUpdateRequestStatus('req1', 'declined');

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(raw || '[]');
      expect(requests[0].status).toBe('declined');
      expect(mockFirebaseRequestService.declineFirebaseRequest).not.toHaveBeenCalled();
    });

    it('should call declineFirebaseRequest when Firebase configured and status is declined', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseRequestService.declineFirebaseRequest.mockResolvedValue(undefined);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([{ ...mockRequest, id: 'req1', status: 'pending' }])
      );

      await hybridUpdateRequestStatus('req1', 'declined', 'No thanks');

      expect(mockFirebaseRequestService.declineFirebaseRequest).toHaveBeenCalledWith('req1', 'No thanks');
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(raw || '[]');
      expect(requests[0].status).toBe('declined');
    });

    it('should not throw when Firebase sync fails after local update', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseRequestService.declineFirebaseRequest.mockRejectedValue(new Error('Network error'));
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([{ ...mockRequest, id: 'req1', status: 'pending' }])
      );

      await expect(hybridUpdateRequestStatus('req1', 'declined')).resolves.not.toThrow();

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MENTORSHIP_REQUESTS);
      const requests = JSON.parse(raw || '[]');
      expect(requests[0].status).toBe('declined');
    });

    it('should throw when local update fails', async () => {
      await expect(hybridUpdateRequestStatus('nonexistent', 'declined')).rejects.toThrow();
    });
  });

  describe('hybridGetRequestsByStatus', () => {
    it('should return local requests by status when Firebase not configured', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([
          { ...mockRequest, id: 'a1', status: 'accepted', requesterEmail: 'user@example.com' },
          { ...mockRequest, id: 'a2', status: 'accepted', mentorEmail: 'user@example.com' },
        ])
      );

      const result = await hybridGetRequestsByStatus('user@example.com', 'accepted');

      expect(result).toHaveLength(2);
      expect(mockFirebaseRequestService.getFirebaseRequestsByStatus).not.toHaveBeenCalled();
    });

    it('should fallback to local when Firebase get by status fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseRequestService.getFirebaseRequestsByStatus.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([{ ...mockRequest, id: 'a1', status: 'accepted', requesterEmail: 'user@example.com' }])
      );

      const result = await hybridGetRequestsByStatus('user@example.com', 'accepted');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });
  });

  describe('hybridGetRequestById', () => {
    it('should return local request when Firebase not configured', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEYS.MENTORSHIP_REQUESTS,
        JSON.stringify([{ ...mockRequest, id: 'req1' }])
      );

      const result = await hybridGetRequestById('req1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('req1');
      expect(mockFirebaseRequestService.getFirebaseRequest).not.toHaveBeenCalled();
    });

    it('should return null for nonexistent id', async () => {
      const result = await hybridGetRequestById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('isFirebaseSyncAvailable', () => {
    it('should return false when Firebase not configured', () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(false);
      expect(isFirebaseSyncAvailable()).toBe(false);
    });

    it('should return true when Firebase configured', () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      expect(isFirebaseSyncAvailable()).toBe(true);
    });
  });
});
