/**
 * Firebase Message Service Tests
 * 
 * Tests for services/firebaseMessageService.ts - Firebase message service
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
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: jest.fn(),
  QueryConstraint: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../firebaseMessageService');

import {
  generateConversationId,
  createOrGetConversation,
  sendMessage,
  getMessages,
  getUserConversations,
  markMessagesAsRead,
  subscribeToMessages,
} from '../firebaseMessageService';
import { Message, Conversation } from '../../types/types';
import * as firestore from 'firebase/firestore';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirestore = firestore as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Firebase Message Service', () => {
  const mockConversation: Conversation = {
    id: 'conv123',
    participants: ['user1@example.com', 'user2@example.com'],
    participantNames: {
      'user1@example.com': 'User 1',
      'user2@example.com': 'User 2',
    },
    unreadCount: {
      'user1@example.com': 0,
      'user2@example.com': 0,
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockMessage: Message = {
    id: 'msg123',
    conversationId: 'conv123',
    senderEmail: 'user1@example.com',
    senderName: 'User 1',
    receiverEmail: 'user2@example.com',
    receiverName: 'User 2',
    text: 'Hello',
    createdAt: '2024-01-01T00:00:00.000Z',
    read: false,
  };

  const mockDb = {};
  const mockCollectionRef = {};
  const mockDocRef = { id: 'conv123' };
  const mockDocSnap = {
    exists: jest.fn(() => true),
    id: 'conv123',
    data: jest.fn(() => mockConversation),
  };
  const mockAddDocRef = { id: 'msg123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseConfig.getFirebaseFirestore.mockReturnValue(mockDb);
    mockFirestore.collection.mockReturnValue(mockCollectionRef);
    mockFirestore.doc.mockReturnValue(mockDocRef);
    mockFirestore.getDoc.mockResolvedValue(mockDocSnap);
    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.addDoc.mockResolvedValue(mockAddDocRef);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
  });

  describe('generateConversationId', () => {
    it('should generate conversation ID from sorted emails', () => {
      const id = generateConversationId('user1@example.com', 'user2@example.com');
      expect(id).toBe('user1@example.com_user2@example.com');
    });

    it('should generate same ID regardless of email order', () => {
      const id1 = generateConversationId('user1@example.com', 'user2@example.com');
      const id2 = generateConversationId('user2@example.com', 'user1@example.com');
      expect(id1).toBe(id2);
    });
  });

  describe('createOrGetConversation', () => {
    it('should get existing conversation', async () => {
      const conversation = await createOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      expect(conversation).toEqual(mockConversation);
      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'conversations', 'user1@example.com_user2@example.com');
      expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should create new conversation when not exists', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: jest.fn(() => false),
      });

      const conversation = await createOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      expect(conversation.id).toBe('user1@example.com_user2@example.com');
      expect(conversation.participants).toContain('user1@example.com');
      expect(conversation.participants).toContain('user2@example.com');
      expect(mockFirestore.setDoc).toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Create/get failed');
      mockFirestore.getDoc.mockRejectedValue(error);

      await expect(
        createOrGetConversation('user1@example.com', 'User 1', 'user2@example.com', 'User 2')
      ).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in createOrGetConversation', async () => {
      mockFirestore.getDoc.mockRejectedValue('Create/get failed string');

      await expect(
        createOrGetConversation('user1@example.com', 'User 1', 'user2@example.com', 'User 2')
      ).rejects.toBe('Create/get failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      // Mock getDoc for conversation to get unread count
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: jest.fn(() => true),
        data: jest.fn(() => ({
          ...mockConversation,
          unreadCount: { 'user2@example.com': 0 },
        })),
      });

      const message = await sendMessage(
        'conv123',
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2',
        'Hello'
      );

      expect(message.id).toBe('msg123');
      expect(message.text).toBe('Hello');
      expect(mockFirestore.collection).toHaveBeenCalledWith(mockDb, 'messages');
      expect(mockFirestore.addDoc).toHaveBeenCalled();
    });

    it('should update conversation unread count', async () => {
      // Mock getDoc for conversation to get unread count
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: jest.fn(() => true),
        data: jest.fn(() => ({
          ...mockConversation,
          unreadCount: { 'user2@example.com': 0 },
        })),
      });

      await sendMessage('conv123', 'user1@example.com', 'User 1', 'user2@example.com', 'User 2', 'Hello');

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'conversations', 'conv123');
      expect(mockFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Send failed');
      mockFirestore.addDoc.mockRejectedValue(error);

      await expect(
        sendMessage('conv123', 'user1@example.com', 'User 1', 'user2@example.com', 'User 2', 'Hello')
      ).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in sendMessage', async () => {
      mockFirestore.addDoc.mockRejectedValue('Send failed string');

      await expect(
        sendMessage('conv123', 'user1@example.com', 'User 1', 'user2@example.com', 'User 2', 'Hello')
      ).rejects.toBe('Send failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
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
            id: 'msg123',
            data: () => mockMessage,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const messages = await getMessages('conv123');

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg123');
      expect(mockFirestore.where).toHaveBeenCalledWith('conversationId', '==', 'conv123');
    });

    it('should handle errors and throw', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get messages failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getMessages('conv123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getMessages', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Get messages failed string');

      await expect(getMessages('conv123')).rejects.toBe('Get messages failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserConversations', () => {
    it('should get user conversations successfully', async () => {
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
            id: 'conv123',
            data: () => mockConversation,
          },
        ],
      };
      mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

      const conversations = await getUserConversations('user1@example.com');

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv123');
      expect(mockFirestore.where).toHaveBeenCalledWith('participants', 'array-contains', 'user1@example.com');
    });

    it('should handle errors and throw', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      const error = new Error('Get conversations failed');
      mockFirestore.getDocs.mockRejectedValue(error);

      await expect(getUserConversations('user1@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getUserConversations', async () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockRejectedValue('Get conversations failed string');

      await expect(getUserConversations('user1@example.com')).rejects.toBe('Get conversations failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read successfully', async () => {
      await markMessagesAsRead('conv123', 'user1@example.com');

      expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, 'conversations', 'conv123');
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(mockDocRef, {
        'unreadCount.user1@example.com': 0,
      });
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Mark read failed');
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(markMessagesAsRead('conv123', 'user1@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in markMessagesAsRead', async () => {
      mockFirestore.updateDoc.mockRejectedValue('Mark read failed string');

      await expect(markMessagesAsRead('conv123', 'user1@example.com')).rejects.toBe('Mark read failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('subscribeToMessages', () => {
    it('should subscribe to messages successfully', () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const mockUnsubscribe = jest.fn();
      mockFirestore.onSnapshot.mockReturnValue(mockUnsubscribe);

      const callback = jest.fn();
      const unsubscribe = subscribeToMessages('conv123', callback);

      expect(mockFirestore.where).toHaveBeenCalledWith('conversationId', '==', 'conv123');
      expect(mockFirestore.onSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should call callback when messages update', () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const callback = jest.fn();
      let snapshotCallback: any;
      mockFirestore.onSnapshot.mockImplementation((query, onNext) => {
        snapshotCallback = onNext;
        return jest.fn();
      });

      subscribeToMessages('conv123', callback);

      const mockSnapshot = {
        forEach: jest.fn((cb) => {
          cb({ id: 'msg123', data: () => mockMessage });
        }),
      };

      snapshotCallback(mockSnapshot);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toHaveLength(1);
    });

    it('should handle errors in subscription', () => {
      const mockWhere = {};
      const mockOrderBy = {};
      const mockQuery = {};
      mockFirestore.where.mockReturnValue(mockWhere);
      mockFirestore.orderBy.mockReturnValue(mockOrderBy);
      mockFirestore.query.mockReturnValue(mockQuery);
      
      const callback = jest.fn();
      let errorCallback: any;
      mockFirestore.onSnapshot.mockImplementation((query, onNext, onErr) => {
        errorCallback = onErr;
        return jest.fn();
      });

      subscribeToMessages('conv123', callback);

      const error = new Error('Subscription error');
      errorCallback(error);

      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });
});
