// Mock logger to avoid console output
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Unmock invitationCodeService to use actual implementation
jest.unmock('../invitationCodeService');

// Note: AsyncStorage and firebase.config are already mocked globally in jest.setup.js
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

import {
  createInvitationCode,
  useInvitationCode,
  isValidInvitationCode,
  getUnusedInvitationCodes,
  generateMultipleInvitationCodes,
} from '../invitationCodeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InvitationCode } from '@/types/types';
import * as firebaseConfig from '@/config/firebase.config';

describe('invitationCodeService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    // Firebase is already mocked to return false in jest.setup.js
  });

  describe('createInvitationCode', () => {
    it('should create a new invitation code', async () => {
      const code = await createInvitationCode('user@example.com');

      expect(code).toMatchObject({
        code: expect.stringMatching(/^[A-Z0-9]{8}$/),
        createdBy: 'user@example.com',
        isUsed: false,
      });
      expect(code.id).toBeDefined();
      expect(code.createdAt).toBeDefined();
    });

    it('should save code to local storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await createInvitationCode('user@example.com');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'invitationCodes',
        expect.stringContaining('user@example.com')
      );
    });

    it('should generate unique codes', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const code1 = await createInvitationCode('user@example.com');
      const code2 = await createInvitationCode('user@example.com');

      expect(code1.code).not.toBe(code2.code);
    });
  });

  describe('isValidInvitationCode', () => {
    it('should return true for valid unused code', async () => {
      const codes: InvitationCode[] = [
        {
          id: 'code1',
          code: 'ABC12345',
          createdBy: 'user@example.com',
          isUsed: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(codes));

      const result = await isValidInvitationCode('ABC12345');
      expect(result).toBe(true);
    });

    it('should return false for used code', async () => {
      const codes: InvitationCode[] = [
        {
          id: 'code1',
          code: 'ABC12345',
          createdBy: 'user@example.com',
          isUsed: true,
          usedBy: 'other@example.com',
          usedAt: '2026-01-20T11:00:00Z',
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(codes));

      const result = await isValidInvitationCode('ABC12345');
      expect(result).toBe(false);
    });

    it('should return false for non-existent code', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await isValidInvitationCode('INVALID');
      expect(result).toBe(false);
    });
  });

  describe('useInvitationCode', () => {
    it('should mark code as used', async () => {
      const codes: InvitationCode[] = [
        {
          id: 'code1',
          code: 'ABC12345',
          createdBy: 'user@example.com',
          isUsed: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(codes));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedCodes = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedCodes[0].isUsed).toBe(true);
      expect(savedCodes[0].usedBy).toBe('newuser@example.com');
      expect(savedCodes[0].usedAt).toBeDefined();
    });

    it('should return false for already used code', async () => {
      const codes: InvitationCode[] = [
        {
          id: 'code1',
          code: 'ABC12345',
          createdBy: 'user@example.com',
          isUsed: true,
          usedBy: 'other@example.com',
          usedAt: '2026-01-20T11:00:00Z',
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(codes));

      const result = await useInvitationCode('ABC12345', 'newuser@example.com');
      expect(result).toBe(false);
    });

    it('should return false for non-existent code', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await useInvitationCode('INVALID', 'newuser@example.com');
      expect(result).toBe(false);
    });
  });

  describe('getUnusedInvitationCodes', () => {
    it('should return only unused codes for user', async () => {
      const codes: InvitationCode[] = [
        {
          id: 'code1',
          code: 'ABC12345',
          createdBy: 'user@example.com',
          isUsed: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
        {
          id: 'code2',
          code: 'XYZ67890',
          createdBy: 'user@example.com',
          isUsed: true,
          usedBy: 'other@example.com',
          usedAt: '2026-01-20T11:00:00Z',
          createdAt: '2026-01-20T10:00:00Z',
        },
        {
          id: 'code3',
          code: 'DEF11111',
          createdBy: 'other@example.com',
          isUsed: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(codes));

      const result = await getUnusedInvitationCodes('user@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ABC12345');
    });

    it('should return empty array when no unused codes', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getUnusedInvitationCodes('user@example.com');
      expect(result).toEqual([]);
    });
  });

  describe('generateMultipleInvitationCodes', () => {
    it('should generate multiple codes', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const codes = await generateMultipleInvitationCodes(5, 'user@example.com');

      expect(codes).toHaveLength(5);
      codes.forEach((code) => {
        expect(code.createdBy).toBe('user@example.com');
        expect(code.isUsed).toBe(false);
      });
    });

    it('should generate unique codes', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const codes = await generateMultipleInvitationCodes(10, 'user@example.com');

      const codeValues = codes.map((c) => c.code);
      const uniqueCodes = new Set(codeValues);
      expect(uniqueCodes.size).toBe(10);
    });
  });
});
