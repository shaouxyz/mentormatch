/**
 * Firebase Meeting Service Tests
 * 
 * Tests for services/firebaseMeetingService.ts - Firebase meeting service
 */

// Mock firebase/firestore first
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../firebaseMeetingService');

import {
  createMeetingRequest,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  getUserMeetings,
  getPendingMeetingRequests,
  getUpcomingMeetings,
  subscribeToUserMeetings,
} from '../firebaseMeetingService';
import { Meeting } from '../../types/types';
import * as firestore from 'firebase/firestore';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirestore = firestore as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Firebase Meeting Service', () => {
  const mockMeeting: Omit<Meeting, 'id'> = {
    organizerEmail: 'organizer@example.com',
    organizerName: 'Organizer',
    participantEmail: 'participant@example.com',
    participantName: 'Participant',
    title: 'Test Meeting',
    description: 'Test Description',
    date: '2024-12-31T10:00:00.000Z',
    time: '2024-12-31T10:00:00.000Z',
    duration: 60,
    location: 'Test Location',
    locationType: 'in-person',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDb = {};
  const mockCollectionRef = {};
  const mockDocRef = { id: 'meeting123' };
  const mockDocSnap = {
    exists: jest.fn(() => true),
    id: 'meeting123',
    data: jest.fn(() => mockMeeting),
  };
  const mockAddDocRef = { id: 'newMeeting123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseConfig.getFirebaseFirestore.mockReturnValue(mockDb);
    mockFirestore.collection.mockReturnValue(mockCollectionRef);
    mockFirestore.doc.mockReturnValue(mockDocRef);
    mockFirestore.getDoc.mockResolvedValue(mockDocSnap);
    mockFirestore.addDoc.mockResolvedValue(mockAddDocRef);
    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    mockFirestore.deleteDoc.mockResolvedValue(undefined);
  });

  describe('createMeetingRequest', () => {
    it('should create meeting successfully', async () => {
      const meeting = await createMeetingRequest(mockMeeting);

      expect(meeting.id).toBe('newMeeting123');
      expect(meeting.title).toBe('Test Meeting');
      expect(meeting.status).toBe('pending');
      expect(mockFirestore.collection).toHaveBeenCalledWith(mockDb, 'meetings');
      expect(mockFirestore.addDoc).toHaveBeenCalled();
    });

    it('should include optional description and meetingLink', async () => {
      const meetingWithOptional: Omit<Meeting, 'id'> = {
        ...mockMeeting,
        description: 'Test Description',
        meetingLink: 'https://meet.example.com',
      };

      await createMeetingRequest(meetingWithOptional);

      const addDocCall = mockFirestore.addDoc.mock.calls[0];
      const meetingData = addDocCall[1];
      expect(meetingData.description).toBe('Test Description');
      expect(meetingData.meetingLink).toBe('https://meet.example.com');
    });

    it('should handle empty location for virtual meetings', async () => {
      const virtualMeeting: Omit<Meeting, 'id'> = {
        ...mockMeeting,
        locationType: 'virtual',
        location: '',
      };

      await createMeetingRequest(virtualMeeting);

      const addDocCall = mockFirestore.addDoc.mock.calls[0];
      const meetingData = addDocCall[1];
      expect(meetingData.location).toBe('');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Create failed');
      mockFirestore.addDoc.mockRejectedValue(error);

      await expect(createMeetingRequest(mockMeeting)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in createMeetingRequest', async () => {
      mockFirestore.addDoc.mockRejectedValue('Create failed string');

      await expect(createMeetingRequest(mockMeeting)).rejects.toBe('Create failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getMeeting', () => {
    it('should get meeting successfully', async () => {
      const meeting = await getMeeting('meeting123');

      expect(meeting).toBeTruthy();
      expect(meeting?.id).toBe('meeting123');
      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'meetings', 'meeting123');
      expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should return null when meeting does not exist', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: jest.fn(() => false),
      });

      const meeting = await getMeeting('nonexistent');

      expect(meeting).toBeNull();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Get failed');
      mockFirestore.getDoc.mockRejectedValue(error);

      await expect(getMeeting('meeting123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getMeeting', async () => {
      mockFirestore.getDoc.mockRejectedValue('Get failed string');

      await expect(getMeeting('meeting123')).rejects.toBe('Get failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('updateMeeting', () => {
    it('should update meeting successfully', async () => {
      await updateMeeting('meeting123', { status: 'accepted' });

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'meetings', 'meeting123');
      expect(mockFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should include updatedAt timestamp', async () => {
      await updateMeeting('meeting123', { status: 'accepted' });

      const updateDocCall = mockFirestore.updateDoc.mock.calls[0];
      const updateData = updateDocCall[1];
      expect(updateData.updatedAt).toBeTruthy();
      expect(updateData.status).toBe('accepted');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Update failed');
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(updateMeeting('meeting123', { status: 'accepted' })).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in updateMeeting', async () => {
      mockFirestore.updateDoc.mockRejectedValue('Update failed string');

      await expect(updateMeeting('meeting123', { status: 'accepted' })).rejects.toBe('Update failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteMeeting', () => {
    it('should delete meeting successfully', async () => {
      await deleteMeeting('meeting123');

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'meetings', 'meeting123');
      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Delete failed');
      mockFirestore.deleteDoc.mockRejectedValue(error);

      await expect(deleteMeeting('meeting123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in deleteMeeting', async () => {
      mockFirestore.deleteDoc.mockRejectedValue('Delete failed string');

      await expect(deleteMeeting('meeting123')).rejects.toBe('Delete failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserMeetings', () => {
    it('should get user meetings successfully', async () => {
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
            id: 'meeting1',
            data: () => ({ ...mockMeeting, date: '2024-12-30T10:00:00.000Z' }),
          },
        ],
      };
      const mockSnapshot2 = {
        forEach: jest.fn((callback) => {
          mockSnapshot2.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'meeting2',
            data: () => ({ ...mockMeeting, date: '2024-12-31T10:00:00.000Z' }),
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValueOnce(mockSnapshot1).mockResolvedValueOnce(mockSnapshot2);

      const meetings = await getUserMeetings('user@example.com');

      expect(meetings).toHaveLength(2);
      expect(mockFirestore.where).toHaveBeenCalledWith('organizerEmail', '==', 'user@example.com');
      expect(mockFirestore.where).toHaveBeenCalledWith('participantEmail', '==', 'user@example.com');
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
      const error = new Error('Get user meetings failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getUserMeetings('user@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getPendingMeetingRequests', () => {
    it('should get pending meetings successfully', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'meeting1',
            data: () => ({ ...mockMeeting, status: 'pending' }),
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const meetings = await getPendingMeetingRequests('user@example.com');

      expect(meetings).toHaveLength(1);
      expect(mockFirestore.where).toHaveBeenCalledWith('participantEmail', '==', 'user@example.com');
      expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'pending');
    });

    it('should handle errors and throw', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get pending failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getPendingMeetingRequests('user@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getUpcomingMeetings', () => {
    it('should get upcoming meetings successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

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
            id: 'meeting1',
            data: () => ({ ...mockMeeting, date: futureDate.toISOString(), status: 'accepted' }),
          },
        ],
      };
      const mockSnapshot2 = {
        forEach: jest.fn((callback) => {
          mockSnapshot2.docs.forEach(callback);
        }),
        docs: [],
      };
      mockFirestore.getDocs.mockResolvedValueOnce(mockSnapshot1).mockResolvedValueOnce(mockSnapshot2);

      const meetings = await getUpcomingMeetings('user@example.com');

      expect(meetings).toHaveLength(1);
      expect(meetings[0].status).toBe('accepted');
    });

    it('should filter out past meetings', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

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
            id: 'meeting1',
            data: () => ({ ...mockMeeting, date: pastDate.toISOString(), status: 'accepted' }),
          },
        ],
      };
      const mockSnapshot2 = {
        forEach: jest.fn(),
        docs: [],
      };
      mockFirestore.getDocs.mockResolvedValueOnce(mockSnapshot1).mockResolvedValueOnce(mockSnapshot2);

      const meetings = await getUpcomingMeetings('user@example.com');

      expect(meetings).toHaveLength(0);
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
      const error = new Error('Get upcoming failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getUpcomingMeetings('user@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('subscribeToUserMeetings', () => {
    it('should subscribe to meetings successfully', () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      mockFirestore.onSnapshot.mockReturnValueOnce(mockUnsubscribe1).mockReturnValueOnce(mockUnsubscribe2);

      const callback = jest.fn();
      const unsubscribe = subscribeToUserMeetings('user@example.com', callback);

      expect(mockFirestore.onSnapshot).toHaveBeenCalledTimes(2);
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
    });

    it('should call callback when meetings update', () => {
      // Reset mocks
      jest.clearAllMocks();
      mockFirebaseConfig.getFirebaseFirestore.mockReturnValue(mockDb);
      mockFirestore.collection.mockReturnValue(mockCollectionRef);
      
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      
      const callback = jest.fn();
      const onError = jest.fn();
      
      let snapshotCallback1: any;
      let snapshotCallback2: any;
      mockFirestore.onSnapshot.mockImplementation((query, onNext, onErr) => {
        if (query === mockQuery1) {
          snapshotCallback1 = onNext;
        } else if (query === mockQuery2) {
          snapshotCallback2 = onNext;
        }
        return jest.fn();
      });

      subscribeToUserMeetings('user@example.com', callback, onError);

      // Simulate snapshot updates - need to call both to trigger updateMeetings
      const mockSnapshot1 = {
        forEach: jest.fn((cb) => {
          cb({ id: 'meeting1', data: () => ({ ...mockMeeting, date: '2024-12-30T10:00:00.000Z' }) });
        }),
      };
      const mockSnapshot2 = {
        forEach: jest.fn((cb) => {
          cb({ id: 'meeting2', data: () => ({ ...mockMeeting, date: '2024-12-31T10:00:00.000Z' }) });
        }),
      };

      // Call first snapshot (unsubscribeCount = 1, not enough)
      snapshotCallback1(mockSnapshot1);
      expect(callback).not.toHaveBeenCalled();

      // Call second snapshot (unsubscribeCount = 2, should trigger callback)
      snapshotCallback2(mockSnapshot2);
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toHaveLength(2);
    });

    it('should handle errors in subscription', () => {
      // Reset mocks
      jest.clearAllMocks();
      mockFirebaseConfig.getFirebaseFirestore.mockReturnValue(mockDb);
      mockFirestore.collection.mockReturnValue(mockCollectionRef);
      
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockQuery1 = {};
      const mockQuery2 = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.query.mockReturnValueOnce(mockQuery1).mockReturnValueOnce(mockQuery2);
      
      const callback = jest.fn();
      const onError = jest.fn();
      
      let errorCallback1: any;
      mockFirestore.onSnapshot.mockImplementation((query, onNext, onErr) => {
        if (query === mockQuery1) {
          errorCallback1 = onErr;
        }
        return jest.fn();
      });

      subscribeToUserMeetings('user@example.com', callback, onError);

      const error = new Error('Subscription error');
      errorCallback1(error);

      expect(mockLogger.logger.error).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should handle errors and throw', () => {
      const error = new Error('Subscribe failed');
      mockFirestore.where.mockImplementation(() => {
        throw error;
      });

      expect(() => subscribeToUserMeetings('user@example.com', jest.fn())).toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });
});
