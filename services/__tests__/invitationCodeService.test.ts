/**
 * Invitation Code Service Tests
 * 
 * Tests for services/invitationCodeService.ts - invitation code service
 */

// Mock firebase/firestore first
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../invitationCodeService');

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createInvitationCode,
  useInvitationCode,
  isValidInvitationCode,
  getUnusedInvitationCodes,
  generateMultipleInvitationCodes,
} from '../invitationCodeService';
import { InvitationCode } from '../../types/types';
import * as firestore from 'firebase/firestore';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirestore = firestore as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Invitation Code Service', () => {
  const mockInvitationCode: InvitationCode = {
    id: 'code123',
    code: 'ABC12345',
    createdBy: 'user@example.com',
    isUsed: false,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDb = {};
  const mockCollectionRef = {};
  const mockDocRef = { id: 'firebase_code123' };
  const mockQuerySnapshot = {
    empty: false,
    docs: [
      {
        id: 'firebase_code123',
        ref: mockDocRef,
        data: () => mockInvitationCode,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(false);
    mockFirebaseConfig.getFirebaseFirestore.mockReturnValue(mockDb);
    mockFirestore.collection.mockReturnValue(mockCollectionRef);
    mockFirestore.doc.mockReturnValue(mockDocRef);
    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
  });

  describe('createInvitationCode', () => {
    it('should create invitation code locally when Firebase is not configured', async () => {
      const code = await createInvitationCode('user@example.com');

      expect(code.code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code.createdBy).toBe('user@example.com');
      expect(code.isUsed).toBe(false);

      const localCodes = await AsyncStorage.getItem('invitationCodes');
      expect(localCodes).toBeTruthy();
      const codes = JSON.parse(localCodes || '[]');
      expect(codes).toHaveLength(1);
    });

    it('should create invitation code via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.setDoc.mockResolvedValue(undefined);

      const code = await createInvitationCode('user@example.com');

      expect(code.id).toBe('firebase_code123');
      expect(mockFirestore.collection).toHaveBeenCalledWith(mockDb, 'invitationCodes');
      expect(mockFirestore.setDoc).toHaveBeenCalled();
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.setDoc.mockRejectedValue(new Error('Firebase error'));

      const code = await createInvitationCode('user@example.com');

      expect(code.code).toMatch(/^[A-Z2-9]{8}$/);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(createInvitationCode('user@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in Firebase createInvitationCode', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.setDoc.mockRejectedValue('Firebase error string');

      const code = await createInvitationCode('user@example.com');

      expect(code.code).toMatch(/^[A-Z2-9]{8}$/);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in outer catch block of createInvitationCode', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(createInvitationCode('user@example.com')).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('useInvitationCode', () => {
    it('should use invitation code locally when Firebase is not configured', async () => {
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([mockInvitationCode]));

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(true);
      const localCodes = await AsyncStorage.getItem('invitationCodes');
      const codes = JSON.parse(localCodes || '[]');
      expect(codes[0].isUsed).toBe(true);
      expect(codes[0].usedBy).toBe('newuser@example.com');
    });

    it('should use invitation code via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const mockQuerySnapshotUsed = {
        empty: false,
        docs: [
          {
            id: 'firebase_code123',
            ref: mockDocRef,
            data: () => ({ ...mockInvitationCode, isUsed: false }),
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshotUsed);

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(true);
      expect(mockFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should return false when code is already used', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const mockQuerySnapshotUsed = {
        empty: false,
        docs: [
          {
            id: 'firebase_code123',
            ref: mockDocRef,
            data: () => ({ ...mockInvitationCode, isUsed: true }),
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshotUsed);

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(false);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should return false when code not found', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockResolvedValue({ empty: true });
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([]));

      const result = await useInvitationCode('INVALID', 'newuser@example.com');

      expect(result).toBe(false);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([mockInvitationCode]));

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(true);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and return false', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(false);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in Firebase useInvitationCode', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockRejectedValue('Firebase error string');
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([mockInvitationCode]));

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(true);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in outer catch block of useInvitationCode', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(false);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('isValidInvitationCode', () => {
    it('should return true for valid unused code locally', async () => {
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([mockInvitationCode]));

      const result = await isValidInvitationCode('ABC12345');

      expect(result).toBe(true);
    });

    it('should return false for used code', async () => {
      const usedCode = { ...mockInvitationCode, isUsed: true };
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([usedCode]));

      const result = await isValidInvitationCode('ABC12345');

      expect(result).toBe(false);
    });

    it('should return false for non-existent code', async () => {
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([]));

      const result = await isValidInvitationCode('INVALID');

      expect(result).toBe(false);
    });

    it('should check via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const mockQuerySnapshotValid = {
        empty: false,
        docs: [
          {
            id: 'firebase_code123',
            data: () => ({ ...mockInvitationCode, isUsed: false }),
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshotValid);

      const result = await isValidInvitationCode('ABC12345');

      expect(result).toBe(true);
      expect(mockFirestore.where).toHaveBeenCalledWith('code', '==', 'ABC12345');
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([mockInvitationCode]));

      const result = await isValidInvitationCode('ABC12345');

      expect(result).toBe(true);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and return false', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const result = await isValidInvitationCode('ABC12345');

      expect(result).toBe(false);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('getUnusedInvitationCodes', () => {
    it('should get unused codes locally when Firebase is not configured', async () => {
      const codes = [
        mockInvitationCode,
        { ...mockInvitationCode, id: 'code2', code: 'XYZ67890', isUsed: true },
        { ...mockInvitationCode, id: 'code3', code: 'DEF45678', createdBy: 'other@example.com' },
      ];
      await AsyncStorage.setItem('invitationCodes', JSON.stringify(codes));

      const result = await getUnusedInvitationCodes('user@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ABC12345');
    });

    it('should get unused codes via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockQuerySnapshot.docs.forEach(callback);
        }),
        docs: [
          {
            id: 'firebase_code123',
            data: () => mockInvitationCode,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);
      const mockWhere1 = {};
      const mockWhere2 = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValueOnce(mockWhere1).mockReturnValueOnce(mockWhere2);
      mockFirestore.query.mockReturnValue(mockQuery);

      const result = await getUnusedInvitationCodes('user@example.com');

      expect(result).toHaveLength(1);
      expect(mockFirestore.where).toHaveBeenCalledWith('createdBy', '==', 'user@example.com');
      expect(mockFirestore.where).toHaveBeenCalledWith('isUsed', '==', false);
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem('invitationCodes', JSON.stringify([mockInvitationCode]));

      const result = await getUnusedInvitationCodes('user@example.com');

      expect(result).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and return empty array', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const result = await getUnusedInvitationCodes('user@example.com');

      expect(result).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('generateMultipleInvitationCodes', () => {
    it('should generate multiple codes successfully', async () => {
      const codes = await generateMultipleInvitationCodes(3, 'user@example.com');

      expect(codes).toHaveLength(3);
      codes.forEach(code => {
        expect(code.code).toMatch(/^[A-Z2-9]{8}$/);
        expect(code.createdBy).toBe('user@example.com');
      });
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(generateMultipleInvitationCodes(3, 'user@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });
  });
});
