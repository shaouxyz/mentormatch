import {
  addInboxItem,
  getInboxItems,
  markInboxItemAsRead,
  getUnreadInboxCount,
  addInvitationCodeToInbox,
} from '../inboxService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InboxItem } from '@/types/types';

// Mock logger to avoid console output
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Unmock inboxService to use actual implementation (jest.setup.js mocks it)
jest.unmock('../inboxService');

// Note: AsyncStorage and firebase.config are already mocked globally in jest.setup.js
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
}));

describe('inboxService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    // Firebase is already mocked to return false in jest.setup.js
  });

  describe('addInboxItem', () => {
    it('should add an inbox item', async () => {
      // Ensure AsyncStorage is clear
      await AsyncStorage.clear();
      
      // Verify AsyncStorage is working
      await AsyncStorage.setItem('test', 'value');
      const testValue = await AsyncStorage.getItem('test');
      expect(testValue).toBe('value');
      await AsyncStorage.clear();
      
      const item = await addInboxItem({
        recipientEmail: 'user@example.com',
        type: 'invitation_code',
        title: 'New Invitation Code',
        message: 'You have a new code',
        invitationCode: 'ABC12345',
      });

      expect(item).toBeDefined();
      expect(item).not.toBeUndefined();
      expect(item).toMatchObject({
        recipientEmail: 'user@example.com',
        type: 'invitation_code',
        title: 'New Invitation Code',
        message: 'You have a new code',
        invitationCode: 'ABC12345',
        read: false,
      });
      expect(item.id).toBeDefined();
      expect(item.createdAt).toBeDefined();
    });

    it('should save item to local storage', async () => {
      await addInboxItem({
        recipientEmail: 'user@example.com',
        type: 'invitation_code',
        title: 'Test',
        message: 'Test message',
      });

      // Verify item was saved by retrieving it
      const items = await getInboxItems('user@example.com');
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].recipientEmail).toBe('user@example.com');
    });
  });

  describe('getInboxItems', () => {
    it('should return inbox items for user', async () => {
      const items: InboxItem[] = [
        {
          id: 'item1',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          invitationCode: 'ABC12345',
          read: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
        {
          id: 'item2',
          recipientEmail: 'user@example.com',
          type: 'mentorship_accepted',
          title: 'Request Accepted',
          message: 'Your request was accepted',
          read: true,
          createdAt: '2026-01-20T09:00:00Z',
        },
      ];

      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const result = await getInboxItems('user@example.com');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item1');
      expect(result[1].id).toBe('item2');
    });

    it('should filter by recipient email', async () => {
      const items: InboxItem[] = [
        {
          id: 'item1',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
        {
          id: 'item2',
          recipientEmail: 'other@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const result = await getInboxItems('user@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item1');
    });

    it('should sort by most recent first', async () => {
      const items: InboxItem[] = [
        {
          id: 'item1',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'Old',
          message: 'Old message',
          read: false,
          createdAt: '2026-01-20T09:00:00Z',
        },
        {
          id: 'item2',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New',
          message: 'New message',
          read: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const result = await getInboxItems('user@example.com');

      expect(result[0].id).toBe('item2');
      expect(result[1].id).toBe('item1');
    });

    it('should return empty array when no items', async () => {
      // No items in storage

      const result = await getInboxItems('user@example.com');
      expect(result).toEqual([]);
    });
  });

  describe('markInboxItemAsRead', () => {
    it('should mark item as read', async () => {
      const items: InboxItem[] = [
        {
          id: 'item1',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      await AsyncStorage.setItem('inbox', JSON.stringify(items));
      // Storage will be set by the function

      await markInboxItemAsRead('item1');

      const savedData = await AsyncStorage.getItem('inbox');
      expect(savedData).toBeTruthy();
      const savedItems = JSON.parse(savedData || '[]');
      expect(savedItems[0].read).toBe(true);
    });

    it('should handle non-existent item gracefully', async () => {
      await AsyncStorage.setItem('inbox', JSON.stringify([]));

      // Should not throw error
      await expect(markInboxItemAsRead('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('getUnreadInboxCount', () => {
    it('should return correct unread count', async () => {
      const items: InboxItem[] = [
        {
          id: 'item1',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: false,
          createdAt: '2026-01-20T10:00:00Z',
        },
        {
          id: 'item2',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: true,
          createdAt: '2026-01-20T09:00:00Z',
        },
        {
          id: 'item3',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: false,
          createdAt: '2026-01-20T08:00:00Z',
        },
      ];

      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const result = await getUnreadInboxCount('user@example.com');
      expect(result).toBe(2);
    });

    it('should return 0 when all items are read', async () => {
      const items: InboxItem[] = [
        {
          id: 'item1',
          recipientEmail: 'user@example.com',
          type: 'invitation_code',
          title: 'New Code',
          message: 'You have a code',
          read: true,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      await AsyncStorage.setItem('inbox', JSON.stringify(items));

      const result = await getUnreadInboxCount('user@example.com');
      expect(result).toBe(0);
    });
  });

  describe('addInvitationCodeToInbox', () => {
    it('should add invitation code to inbox', async () => {
      // No items in storage
      // Storage will be set by the function

      await addInvitationCodeToInbox('user@example.com', 'ABC12345', 'creator@example.com');

      const savedData = await AsyncStorage.getItem('inbox');
      expect(savedData).toBeTruthy();
      const savedItems = JSON.parse(savedData || '[]');
      expect(savedItems[0]).toMatchObject({
        recipientEmail: 'user@example.com',
        type: 'invitation_code',
        title: 'New Invitation Code',
        invitationCode: 'ABC12345',
      });
    });
  });
});
