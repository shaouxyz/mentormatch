/**
 * Inbox Service Tests
 * 
 * Tests for services/inboxService.ts - inbox service
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
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../inboxService');

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addInboxItem,
  getInboxItems,
  markInboxItemAsRead,
  getUnreadInboxCount,
  addInvitationCodeToInbox,
} from '../inboxService';
import { InboxItem } from '../../types/types';
import * as firestore from 'firebase/firestore';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirestore = firestore as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Inbox Service', () => {
  const mockInboxItem: Omit<InboxItem, 'id' | 'read' | 'createdAt'> = {
    recipientEmail: 'user@example.com',
    type: 'notification',
    title: 'Test Notification',
    message: 'Test message',
  };

  const mockDb = {};
  const mockCollectionRef = {};
  const mockDocRef = { id: 'inbox123' };
  const mockQuerySnapshot = {
    forEach: jest.fn((callback) => {
      mockQuerySnapshot.docs.forEach(callback);
    }),
    docs: [
      {
        id: 'inbox123',
        data: () => ({
          ...mockInboxItem,
          id: 'inbox123',
          read: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        }),
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

  describe('addInboxItem', () => {
    it('should add inbox item locally when Firebase is not configured', async () => {
      const item = await addInboxItem(mockInboxItem);

      expect(item.recipientEmail).toBe('user@example.com');
      expect(item.read).toBe(false);
      expect(item.createdAt).toBeTruthy();

      const localItems = await AsyncStorage.getItem('inbox');
      expect(localItems).toBeTruthy();
      const items = JSON.parse(localItems || '[]');
      expect(items).toHaveLength(1);
    });

    it('should add inbox item via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);

      const item = await addInboxItem(mockInboxItem);

      expect(item.id).toBe('inbox123');
      expect(mockFirestore.collection).toHaveBeenCalledWith(mockDb, 'inbox');
      expect(mockFirestore.setDoc).toHaveBeenCalled();
    });

    it('should include invitationCode in Firestore data when present', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const itemWithCode: Omit<InboxItem, 'id' | 'read' | 'createdAt'> = {
        ...mockInboxItem,
        invitationCode: 'ABC12345',
      };

      await addInboxItem(itemWithCode);

      const setDocCall = mockFirestore.setDoc.mock.calls[0];
      const firestoreData = setDocCall[1];
      expect(firestoreData.invitationCode).toBe('ABC12345');
    });

    it('should continue with local save when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.setDoc.mockRejectedValue(new Error('Firebase error'));

      const item = await addInboxItem(mockInboxItem);

      expect(item.recipientEmail).toBe('user@example.com');
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      // Should still be saved locally
      const localItems = await AsyncStorage.getItem('inbox');
      expect(localItems).toBeTruthy();
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(addInboxItem(mockInboxItem)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in Firebase addInboxItem', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.setDoc.mockRejectedValue('Firebase error string');

      const item = await addInboxItem(mockInboxItem);

      expect(item.recipientEmail).toBe('user@example.com');
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      // Should still be saved locally
      const localItems = await AsyncStorage.getItem('inbox');
      expect(localItems).toBeTruthy();
    });

    it('should handle non-Error thrown in outer catch block of addInboxItem', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(addInboxItem(mockInboxItem)).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('getInboxItems', () => {
    it('should get inbox items locally when Firebase is not configured', async () => {
      const inboxItem: InboxItem = {
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await AsyncStorage.setItem('inbox', JSON.stringify([inboxItem]));

      const items = await getInboxItems('user@example.com');

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('local123');
    });

    it('should get inbox items via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const mockWhere = {};
      const mockOrderBy = {};
      const mockLimit = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.limit.mockReturnValue(mockLimit);
      mockFirestore.query.mockReturnValue(mockQuery);

      const items = await getInboxItems('user@example.com');

      expect(items).toHaveLength(1);
      expect(mockFirestore.where).toHaveBeenCalledWith('recipientEmail', '==', 'user@example.com');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockFirestore.limit).toHaveBeenCalledWith(100);
    });

    it('should filter items by user email locally', async () => {
      const items = [
        { ...mockInboxItem, id: 'item1', recipientEmail: 'user@example.com' },
        { ...mockInboxItem, id: 'item2', recipientEmail: 'other@example.com' },
      ];
      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const userItems = await getInboxItems('user@example.com');

      expect(userItems).toHaveLength(1);
      expect(userItems[0].id).toBe('item1');
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockRejectedValue(new Error('Firebase error'));
      const inboxItem: InboxItem = {
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await AsyncStorage.setItem('inbox', JSON.stringify([inboxItem]));

      const items = await getInboxItems('user@example.com');

      expect(items).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and return empty array', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const items = await getInboxItems('user@example.com');

      expect(items).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in Firebase getInboxItems', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.getDocs.mockRejectedValue('Firebase error string');
      const inboxItem: InboxItem = {
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await AsyncStorage.setItem('inbox', JSON.stringify([inboxItem]));

      const items = await getInboxItems('user@example.com');

      expect(items).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in outer catch block of getInboxItems', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');

      const items = await getInboxItems('user@example.com');

      expect(items).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('markInboxItemAsRead', () => {
    it('should mark item as read locally when Firebase is not configured', async () => {
      const inboxItem: InboxItem = {
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await AsyncStorage.setItem('inbox', JSON.stringify([inboxItem]));

      await markInboxItemAsRead('local123');

      const localItems = await AsyncStorage.getItem('inbox');
      const items = JSON.parse(localItems || '[]');
      expect(items).toHaveLength(1);
      expect(items[0].read).toBe(true);
      expect(items[0].id).toBe('local123');
    });

    it('should mark item as read via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);

      await markInboxItemAsRead('inbox123');

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'inbox', 'inbox123');
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(mockDocRef, { read: true });
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.updateDoc.mockRejectedValue(new Error('Firebase error'));
      const inboxItem: InboxItem = {
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await AsyncStorage.setItem('inbox', JSON.stringify([inboxItem]));

      await markInboxItemAsRead('local123');

      const localItems = await AsyncStorage.getItem('inbox');
      const items = JSON.parse(localItems || '[]');
      expect(items).toHaveLength(1);
      expect(items[0].read).toBe(true);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const originalGetItem = AsyncStorage.getItem;
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.getItem = jest.fn().mockResolvedValue(JSON.stringify([{
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      }]));
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(markInboxItemAsRead('local123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in Firebase markInboxItemAsRead', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirestore.updateDoc.mockRejectedValue('Firebase error string');
      const inboxItem: InboxItem = {
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await AsyncStorage.setItem('inbox', JSON.stringify([inboxItem]));

      await markInboxItemAsRead('local123');

      const localItems = await AsyncStorage.getItem('inbox');
      const items = JSON.parse(localItems || '[]');
      expect(items).toHaveLength(1);
      expect(items[0].read).toBe(true);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in outer catch block of markInboxItemAsRead', async () => {
      const originalGetItem = AsyncStorage.getItem;
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.getItem = jest.fn().mockResolvedValue(JSON.stringify([{
        ...mockInboxItem,
        id: 'local123',
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      }]));
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(markInboxItemAsRead('local123')).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('getUnreadInboxCount', () => {
    it('should return unread count', async () => {
      const items: InboxItem[] = [
        { ...mockInboxItem, id: 'item1', recipientEmail: 'user@example.com', read: false, createdAt: '2024-01-01T00:00:00.000Z' },
        { ...mockInboxItem, id: 'item2', recipientEmail: 'user@example.com', read: true, createdAt: '2024-01-02T00:00:00.000Z' },
        { ...mockInboxItem, id: 'item3', recipientEmail: 'user@example.com', read: false, createdAt: '2024-01-03T00:00:00.000Z' },
      ];
      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const count = await getUnreadInboxCount('user@example.com');

      expect(count).toBe(2);
    });

    it('should return 0 when no unread items', async () => {
      const items: InboxItem[] = [
        { ...mockInboxItem, id: 'item1', read: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const count = await getUnreadInboxCount('user@example.com');

      expect(count).toBe(0);
    });

    it('should handle errors and return 0', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const count = await getUnreadInboxCount('user@example.com');

      expect(count).toBe(0);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getUnreadInboxCount', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');

      const count = await getUnreadInboxCount('user@example.com');

      expect(count).toBe(0);
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('addInvitationCodeToInbox', () => {
    it('should add invitation code to inbox', async () => {
      await addInvitationCodeToInbox('user@example.com', 'ABC12345', 'creator@example.com');

      const localItems = await AsyncStorage.getItem('inbox');
      expect(localItems).toBeTruthy();
      const items = JSON.parse(localItems || '[]');
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('invitation_code');
      expect(items[0].invitationCode).toBe('ABC12345');
      expect(items[0].title).toBe('New Invitation Code');
      expect(items[0].recipientEmail).toBe('user@example.com');
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(addInvitationCodeToInbox('user@example.com', 'ABC12345', 'creator@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in addInvitationCodeToInbox', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(addInvitationCodeToInbox('user@example.com', 'ABC12345', 'creator@example.com')).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();

      AsyncStorage.setItem = originalSetItem;
    });
  });
});
