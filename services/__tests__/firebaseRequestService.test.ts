/**
 * Firebase Request Service Tests
 * 
 * Tests for services/firebaseRequestService.ts - Firebase request service
 */

// Mock firebase/firestore first
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  QueryConstraint: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../firebaseRequestService');

import {
  createFirebaseRequest,
  getFirebaseRequest,
  updateFirebaseRequest,
  deleteFirebaseRequest,
  getFirebaseRequestsBySender,
  getFirebaseRequestsByMentor,
  getAllFirebaseRequestsForUser,
  getFirebaseRequestsByStatus,
  acceptFirebaseRequest,
  declineFirebaseRequest,
} from '../firebaseRequestService';
import { MentorshipRequest } from '../../types/types';
import * as firestore from 'firebase/firestore';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirestore = firestore as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Firebase Request Service', () => {
  const mockRequest: MentorshipRequest = {
    id: 'request123',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    mentorEmail: 'mentor@example.com',
    mentorName: 'Mentor',
    note: 'Test note',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDb = {};
  const mockCollectionRef = {};
  const mockDocRef = { id: 'request123' };
  const mockDocSnap = {
    exists: jest.fn(() => true),
    data: jest.fn(() => mockRequest),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseConfig.getFirebaseFirestore.mockReturnValue(mockDb);
    mockFirestore.collection.mockReturnValue(mockCollectionRef);
    mockFirestore.doc.mockReturnValue(mockDocRef);
    mockFirestore.getDoc.mockResolvedValue(mockDocSnap);
    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    mockFirestore.deleteDoc.mockResolvedValue(undefined);
  });

  describe('createFirebaseRequest', () => {
    it('should create request successfully', async () => {
      await createFirebaseRequest(mockRequest);

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'mentorshipRequests', 'request123');
      expect(mockFirestore.setDoc).toHaveBeenCalled();
    });

    it('should include createdAt if not provided', async () => {
      const requestWithoutCreatedAt = { ...mockRequest, createdAt: undefined as any };
      await createFirebaseRequest(requestWithoutCreatedAt);

      const setDocCall = mockFirestore.setDoc.mock.calls[0];
      const requestData = setDocCall[1];
      expect(requestData.createdAt).toBeTruthy();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Create failed');
      mockFirestore.setDoc.mockRejectedValue(error);

      await expect(createFirebaseRequest(mockRequest)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in createFirebaseRequest', async () => {
      mockFirestore.setDoc.mockRejectedValue('Create failed string');

      await expect(createFirebaseRequest(mockRequest)).rejects.toBe('Create failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFirebaseRequest', () => {
    it('should get request successfully', async () => {
      const request = await getFirebaseRequest('request123');

      expect(request).toEqual(mockRequest);
      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'mentorshipRequests', 'request123');
      expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should return null when request does not exist', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: jest.fn(() => false),
      });

      const request = await getFirebaseRequest('nonexistent');

      expect(request).toBeNull();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Get failed');
      mockFirestore.getDoc.mockRejectedValue(error);

      await expect(getFirebaseRequest('request123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseRequest', async () => {
      mockFirestore.getDoc.mockRejectedValue('Get failed string');

      await expect(getFirebaseRequest('request123')).rejects.toBe('Get failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('updateFirebaseRequest', () => {
    it('should update request successfully', async () => {
      await updateFirebaseRequest('request123', { status: 'accepted' });

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'mentorshipRequests', 'request123');
      expect(mockFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should include updatedAt timestamp', async () => {
      await updateFirebaseRequest('request123', { status: 'accepted' });

      const updateDocCall = mockFirestore.updateDoc.mock.calls[0];
      const updateData = updateDocCall[1];
      expect(updateData.updatedAt).toBeTruthy();
      expect(updateData.status).toBe('accepted');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Update failed');
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(updateFirebaseRequest('request123', { status: 'accepted' })).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in updateFirebaseRequest', async () => {
      mockFirestore.updateDoc.mockRejectedValue('Update failed string');

      await expect(updateFirebaseRequest('request123', { status: 'accepted' })).rejects.toBe('Update failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteFirebaseRequest', () => {
    it('should delete request successfully', async () => {
      await deleteFirebaseRequest('request123');

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'mentorshipRequests', 'request123');
      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Delete failed');
      mockFirestore.deleteDoc.mockRejectedValue(error);

      await expect(deleteFirebaseRequest('request123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in deleteFirebaseRequest', async () => {
      mockFirestore.deleteDoc.mockRejectedValue('Delete failed string');

      await expect(deleteFirebaseRequest('request123')).rejects.toBe('Delete failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFirebaseRequestsBySender', () => {
    it('should get requests by sender successfully', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'request123',
            data: () => mockRequest,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const requests = await getFirebaseRequestsBySender('requester@example.com');

      expect(requests).toHaveLength(1);
      expect(requests[0]).toEqual(mockRequest);
      expect(mockFirestore.where).toHaveBeenCalledWith('requesterEmail', '==', 'requester@example.com');
    });

    it('should handle errors and throw', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get by sender failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getFirebaseRequestsBySender('requester@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseRequestsBySender', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Get by sender failed string');

      await expect(getFirebaseRequestsBySender('requester@example.com')).rejects.toBe('Get by sender failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFirebaseRequestsByMentor', () => {
    it('should get requests by mentor successfully', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'request123',
            data: () => mockRequest,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const requests = await getFirebaseRequestsByMentor('mentor@example.com');

      expect(requests).toHaveLength(1);
      expect(mockFirestore.where).toHaveBeenCalledWith('mentorEmail', '==', 'mentor@example.com');
    });

    it('should handle errors and throw', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get by mentor failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getFirebaseRequestsByMentor('mentor@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseRequestsByMentor', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Get by mentor failed string');

      await expect(getFirebaseRequestsByMentor('mentor@example.com')).rejects.toBe('Get by mentor failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getAllFirebaseRequestsForUser', () => {
    it('should get all requests for user successfully', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockOrderBy = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      
      const mockSnapshot1 = {
        forEach: jest.fn((callback) => {
          mockSnapshot1.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'request123',
            data: () => mockRequest,
          },
        ],
      };
      const mockSnapshot2 = {
        forEach: jest.fn(),
        docs: [],
      };
      mockFirestore.getDocs.mockResolvedValueOnce(mockSnapshot1).mockResolvedValueOnce(mockSnapshot2);

      const result = await getAllFirebaseRequestsForUser('user@example.com');

      expect(result.sent).toHaveLength(1);
      expect(result.received).toHaveLength(0);
    });

    it('should handle errors and throw', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockOrderBy = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      const error = new Error('Get all for user failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getAllFirebaseRequestsForUser('user@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getAllFirebaseRequestsForUser', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockOrderBy = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      mockFirestore.getDocs.mockRejectedValue('Get all for user failed string');

      await expect(getAllFirebaseRequestsForUser('user@example.com')).rejects.toBe('Get all for user failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFirebaseRequestsByStatus', () => {
    it('should get requests by status successfully', async () => {
      const acceptedRequest = { ...mockRequest, status: 'accepted' as const };
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockWhere3 = {};
      const mockWhere4 = {};
      const mockOrderBy = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2).mockReturnValueOnce(mockWhere3).mockReturnValueOnce(mockWhere4);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      
      const mockSnapshot1 = {
        forEach: jest.fn((callback) => {
          mockSnapshot1.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'request123',
            data: () => acceptedRequest,
          },
        ],
      };
      const mockSnapshot2 = {
        forEach: jest.fn(),
        docs: [],
      };
      mockFirestore.getDocs.mockResolvedValueOnce(mockSnapshot1).mockResolvedValueOnce(mockSnapshot2);

      const requests = await getFirebaseRequestsByStatus('user@example.com', 'accepted');

      expect(requests).toHaveLength(1);
      expect(mockFirestore.where).toHaveBeenCalledWith('requesterEmail', '==', 'user@example.com');
      expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'accepted');
    });

    it('should handle errors and throw', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockWhere3 = {};
      const mockWhere4 = {};
      const mockOrderBy = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2).mockReturnValueOnce(mockWhere3).mockReturnValueOnce(mockWhere4);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      const error = new Error('Get by status failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getFirebaseRequestsByStatus('user@example.com', 'accepted')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseRequestsByStatus', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockWhere3 = {};
      const mockWhere4 = {};
      const mockOrderBy = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2).mockReturnValueOnce(mockWhere3).mockReturnValueOnce(mockWhere4);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      mockFirestore.getDocs.mockRejectedValue('Get by status failed string');

      await expect(getFirebaseRequestsByStatus('user@example.com', 'accepted')).rejects.toBe('Get by status failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('acceptFirebaseRequest', () => {
    it('should accept request successfully', async () => {
      await acceptFirebaseRequest('request123', 'Accepted!');

      expect(mockFirestore.updateDoc).toHaveBeenCalled();
      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      expect(updateCall[1].status).toBe('accepted');
      expect(updateCall[1].responseNote).toBe('Accepted!');
    });

    it('should accept request without response note', async () => {
      await acceptFirebaseRequest('request123');

      expect(mockFirestore.updateDoc).toHaveBeenCalled();
      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      expect(updateCall[1].status).toBe('accepted');
      expect(updateCall[1].responseNote).toBe('');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Accept failed');
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(acceptFirebaseRequest('request123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in acceptFirebaseRequest', async () => {
      mockFirestore.updateDoc.mockRejectedValue('Accept failed string');

      await expect(acceptFirebaseRequest('request123')).rejects.toBe('Accept failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('declineFirebaseRequest', () => {
    it('should decline request successfully', async () => {
      await declineFirebaseRequest('request123', 'Declined.');

      expect(mockFirestore.updateDoc).toHaveBeenCalled();
      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      expect(updateCall[1].status).toBe('declined');
      expect(updateCall[1].responseNote).toBe('Declined.');
    });

    it('should decline request without response note', async () => {
      await declineFirebaseRequest('request123');

      expect(mockFirestore.updateDoc).toHaveBeenCalled();
      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      expect(updateCall[1].status).toBe('declined');
      expect(updateCall[1].responseNote).toBe('');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Decline failed');
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(declineFirebaseRequest('request123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in declineFirebaseRequest', async () => {
      mockFirestore.updateDoc.mockRejectedValue('Decline failed string');

      await expect(declineFirebaseRequest('request123')).rejects.toBe('Decline failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });
});
