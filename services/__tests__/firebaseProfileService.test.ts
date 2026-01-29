/**
 * Firebase Profile Service Tests
 * 
 * Tests for services/firebaseProfileService.ts - Firebase profile service
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
  DocumentData: jest.fn(),
  QueryConstraint: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../firebaseProfileService');

import {
  createFirebaseProfile,
  getFirebaseProfile,
  updateFirebaseProfile,
  deleteFirebaseProfile,
  getAllFirebaseProfiles,
  searchFirebaseProfiles,
  getFirebaseProfilesByExpertise,
} from '../firebaseProfileService';
import { Profile } from '../../types/types';
import * as firestore from 'firebase/firestore';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirestore = firestore as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Firebase Profile Service', () => {
  const mockProfile: Profile = {
    name: 'Test User',
    email: 'test@example.com',
    expertise: 'Software Engineering',
    interest: 'Machine Learning',
    expertiseYears: 5,
    interestYears: 2,
    phoneNumber: '+1234567890',
  };

  const mockDb = {};
  const mockCollectionRef = {};
  const mockDocRef = { id: 'test@example.com' };
  const mockDocSnap = {
    exists: jest.fn(() => true),
    data: jest.fn(() => mockProfile),
  };
  const mockQuerySnapshot = {
    docs: [
      {
        id: 'test@example.com',
        data: () => mockProfile,
      },
    ],
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
    mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);
  });

  describe('createFirebaseProfile', () => {
    it('should create profile successfully', async () => {
      await createFirebaseProfile(mockProfile);

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'profiles', 'test@example.com');
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
      }));
    });

    it('should include createdAt and updatedAt timestamps', async () => {
      await createFirebaseProfile(mockProfile);

      const setDocCall = mockFirestore.setDoc.mock.calls[0];
      const profileData = setDocCall[1];
      expect(profileData.createdAt).toBeTruthy();
      expect(profileData.updatedAt).toBeTruthy();
      expect(profileData.email).toBe('test@example.com');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Create failed');
      mockFirestore.setDoc.mockRejectedValue(error);

      await expect(createFirebaseProfile(mockProfile)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in createFirebaseProfile', async () => {
      mockFirestore.setDoc.mockRejectedValue('Create failed string');

      await expect(createFirebaseProfile(mockProfile)).rejects.toBe('Create failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFirebaseProfile', () => {
    it('should get profile successfully', async () => {
      const profile = await getFirebaseProfile('test@example.com');

      expect(profile).toEqual(mockProfile);
      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'profiles', 'test@example.com');
      expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should return null when profile does not exist', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: jest.fn(() => false),
      });

      const profile = await getFirebaseProfile('nonexistent@example.com');

      expect(profile).toBeNull();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Get failed');
      mockFirestore.getDoc.mockRejectedValue(error);

      await expect(getFirebaseProfile('test@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseProfile', async () => {
      mockFirestore.getDoc.mockRejectedValue('Get failed string');

      await expect(getFirebaseProfile('test@example.com')).rejects.toBe('Get failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('updateFirebaseProfile', () => {
    it('should update profile successfully', async () => {
      const updates = { name: 'Updated Name' };

      await updateFirebaseProfile('test@example.com', updates);

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'profiles', 'test@example.com');
      expect(mockFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should include updatedAt timestamp', async () => {
      const updates = { name: 'Updated Name' };

      await updateFirebaseProfile('test@example.com', updates);

      const updateDocCall = mockFirestore.updateDoc.mock.calls[0];
      const updateData = updateDocCall[1];
      expect(updateData.updatedAt).toBeTruthy();
      expect(updateData.name).toBe('Updated Name');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Update failed');
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(updateFirebaseProfile('test@example.com', { name: 'Updated' })).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in updateFirebaseProfile', async () => {
      mockFirestore.updateDoc.mockRejectedValue('Update failed string');

      await expect(updateFirebaseProfile('test@example.com', { name: 'Updated' })).rejects.toBe('Update failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteFirebaseProfile', () => {
    it('should delete profile successfully', async () => {
      await deleteFirebaseProfile('test@example.com');

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'profiles', 'test@example.com');
      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Delete failed');
      mockFirestore.deleteDoc.mockRejectedValue(error);

      await expect(deleteFirebaseProfile('test@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in deleteFirebaseProfile', async () => {
      mockFirestore.deleteDoc.mockRejectedValue('Delete failed string');

      await expect(deleteFirebaseProfile('test@example.com')).rejects.toBe('Delete failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getAllFirebaseProfiles', () => {
    it('should get all profiles successfully', async () => {
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      // Mock forEach to iterate over docs
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'test@example.com',
            data: () => mockProfile,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const profiles = await getAllFirebaseProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual(mockProfile);
      expect(mockFirestore.collection).toHaveBeenCalled();
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockFirestore.getDocs).toHaveBeenCalled();
    });

    it('should apply limit when provided', async () => {
      const mockOrderBy = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      await getAllFirebaseProfiles(10);

      expect(mockFirestore.limit).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no profiles exist', async () => {
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn(),
        docs: [],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const profiles = await getAllFirebaseProfiles();

      expect(profiles).toEqual([]);
    });

    it('should handle errors and throw', async () => {
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get all failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getAllFirebaseProfiles()).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getAllFirebaseProfiles', async () => {
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Get all failed string');

      await expect(getAllFirebaseProfiles()).rejects.toBe('Get all failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('searchFirebaseProfiles', () => {
    it('should search profiles successfully', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'test@example.com',
            data: () => mockProfile,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const profiles = await searchFirebaseProfiles('Software');

      expect(profiles).toHaveLength(1);
      expect(mockFirestore.where).toHaveBeenCalled();
      expect(mockFirestore.limit).toHaveBeenCalledWith(50);
    });

    it('should handle errors and throw', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Search failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(searchFirebaseProfiles('Software')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in searchFirebaseProfiles', async () => {
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Search failed string');

      await expect(searchFirebaseProfiles('Software')).rejects.toBe('Search failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFirebaseProfilesByExpertise', () => {
    it('should get profiles by expertise successfully', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockLimit = {};
      const mockQuery = {};
      // Reset mocks for this test
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'test@example.com',
            data: () => mockProfile,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const profiles = await getFirebaseProfilesByExpertise('Software Engineering');

      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual(mockProfile);
      // Verify where was called with field, operator, and value (not collection ref)
      expect(mockFirestore.where).toHaveBeenCalledWith('expertise', '==', 'Software Engineering');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('expertiseYears', 'desc');
      expect(mockFirestore.limit).toHaveBeenCalledWith(50);
    });

    it('should handle errors and throw', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get by expertise failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getFirebaseProfilesByExpertise('Software Engineering')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseProfilesByExpertise', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Get by expertise failed string');

      await expect(getFirebaseProfilesByExpertise('Software Engineering')).rejects.toBe('Get by expertise failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });
});
