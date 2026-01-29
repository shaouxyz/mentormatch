/**
 * Hybrid Message Service Tests
 * 
 * Tests for services/hybridMessageService.ts - hybrid messaging service
 */

// Mock firebase/firestore first to avoid import errors
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

// Mock dependencies BEFORE importing the service
jest.mock('../../config/firebase.config', () => ({
  isFirebaseConfigured: jest.fn(() => false),
  getFirebaseFirestore: jest.fn(() => ({})),
  getFirebaseAuth: jest.fn(() => ({})),
}));

// Mock firebaseMessageService with all exports
const mockCreateOrGetFirebaseConversation = jest.fn();
const mockSendFirebaseMessage = jest.fn();
const mockGetFirebaseMessages = jest.fn();
const mockGetFirebaseUserConversations = jest.fn();
const mockMarkFirebaseMessagesAsRead = jest.fn();
const mockSubscribeToMessages = jest.fn(() => () => {});
const mockGenerateConversationId = jest.fn((email1: string, email2: string) => {
  const emails = [email1, email2].sort();
  return emails.join('_');
});

jest.mock('../firebaseMessageService', () => ({
  createOrGetConversation: (...args: any[]) => mockCreateOrGetFirebaseConversation(...args),
  sendMessage: (...args: any[]) => mockSendFirebaseMessage(...args),
  getMessages: (...args: any[]) => mockGetFirebaseMessages(...args),
  getUserConversations: (...args: any[]) => mockGetFirebaseUserConversations(...args),
  markMessagesAsRead: (...args: any[]) => mockMarkFirebaseMessagesAsRead(...args),
  subscribeToMessages: (...args: any[]) => mockSubscribeToMessages(...args),
  generateConversationId: (...args: any[]) => mockGenerateConversationId(...args),
}));

jest.mock('../../utils/logger');

// IMPORTANT: Don't unmock firebaseMessageService - keep it mocked
// Unmock only the service we're testing
jest.unmock('../hybridMessageService');

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hybridCreateOrGetConversation,
  hybridSendMessage,
  hybridGetMessages,
  hybridGetUserConversations,
} from '../hybridMessageService';
import { Message, Conversation } from '../../types/types';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Hybrid Message Service', () => {
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

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(false);
    
    // Setup generateConversationId mock (it's used internally)
    mockGenerateConversationId.mockImplementation((email1: string, email2: string) => {
      const emails = [email1, email2].sort();
      return emails.join('_');
    });
    
    // Setup other firebase message service mocks with default values
    mockCreateOrGetFirebaseConversation.mockResolvedValue(mockConversation);
    mockSendFirebaseMessage.mockResolvedValue(mockMessage);
    mockGetFirebaseMessages.mockResolvedValue([mockMessage]);
    mockGetFirebaseUserConversations.mockResolvedValue([mockConversation]);
  });

  describe('hybridCreateOrGetConversation', () => {
    it('should create conversation locally when Firebase is not configured', async () => {
      const conversation = await hybridCreateOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      expect(conversation.id).toBe('user1@example.com_user2@example.com');
      expect(conversation.participants).toContain('user1@example.com');
      expect(conversation.participants).toContain('user2@example.com');

      // Should be saved locally
      const conversationsData = await AsyncStorage.getItem('conversations');
      expect(conversationsData).toBeTruthy();
      const conversations = JSON.parse(conversationsData || '[]');
      expect(conversations).toHaveLength(1);
    });

    it('should get existing conversation locally', async () => {
      // The conversation ID will be generated as 'user1@example.com_user2@example.com'
      const conversationId = 'user1@example.com_user2@example.com';
      const localConversation = { ...mockConversation, id: conversationId };
      await AsyncStorage.setItem('conversations', JSON.stringify([localConversation]));

      const conversation = await hybridCreateOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      expect(conversation.id).toBe(conversationId);
    });

    it('should create conversation via Firebase when configured', async () => {
      // Set Firebase as configured BEFORE calling the function
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      
      const firebaseConversation: Conversation = {
        ...mockConversation,
        id: 'firebase_conv123',
        createdAt: '2024-01-02T00:00:00.000Z',
      };
      
      // Reset and set up the mock for this specific test
      mockCreateOrGetFirebaseConversation.mockReset();
      mockCreateOrGetFirebaseConversation.mockResolvedValue(firebaseConversation);

      const conversation = await hybridCreateOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      // Verify Firebase was called
      expect(mockCreateOrGetFirebaseConversation).toHaveBeenCalledWith(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );
      
      // The conversation should come from Firebase
      expect(conversation.id).toBe('firebase_conv123');
      expect(conversation.participants).toContain('user1@example.com');

      // Should be cached locally
      const conversationsData = await AsyncStorage.getItem('conversations');
      expect(conversationsData).toBeTruthy();
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockCreateOrGetFirebaseConversation.mockRejectedValue(new Error('Firebase error'));

      const conversation = await hybridCreateOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      expect(conversation.id).toBe('user1@example.com_user2@example.com');
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in Firebase conversation creation', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockCreateOrGetFirebaseConversation.mockRejectedValue('Firebase error string');

      const conversation = await hybridCreateOrGetConversation(
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2'
      );

      expect(conversation.id).toBe('user1@example.com_user2@example.com');
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in outer catch block of createOrGetConversation', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(
        hybridCreateOrGetConversation('user1@example.com', 'User 1', 'user2@example.com', 'User 2')
      ).rejects.toBe('Storage error string');

      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(
        hybridCreateOrGetConversation('user1@example.com', 'User 1', 'user2@example.com', 'User 2')
      ).rejects.toThrow();

      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('hybridSendMessage', () => {
    it('should send message locally when Firebase is not configured', async () => {
      const message = await hybridSendMessage(
        'conv123',
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2',
        'Hello'
      );

      expect(message.text).toBe('Hello');
      expect(message.conversationId).toBe('conv123');

      // Should be saved locally
      const messagesData = await AsyncStorage.getItem('messages');
      expect(messagesData).toBeTruthy();
      const messages = JSON.parse(messagesData || '[]');
      expect(messages).toHaveLength(1);
    });

    it('should sync message to Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMessage: Message = { ...mockMessage, id: 'firebase_msg123' };
      mockSendFirebaseMessage.mockResolvedValue(firebaseMessage);

      const message = await hybridSendMessage(
        'conv123',
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2',
        'Hello'
      );

      // The function saves locally first, then syncs to Firebase
      // If Firebase succeeds, it returns the Firebase message
      expect(message.id).toBe('firebase_msg123');
      expect(message.text).toBe('Hello');
      expect(mockSendFirebaseMessage).toHaveBeenCalled();
    });

    it('should continue with local message when Firebase sync fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockSendFirebaseMessage.mockRejectedValue(new Error('Firebase error'));

      const message = await hybridSendMessage(
        'conv123',
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2',
        'Hello'
      );

      expect(message.text).toBe('Hello');
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in Firebase message send', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockSendFirebaseMessage.mockRejectedValue('Firebase error string');

      const message = await hybridSendMessage(
        'conv123',
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2',
        'Hello'
      );

      expect(message.text).toBe('Hello');
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should update conversation unread count when sending message', async () => {
      await AsyncStorage.setItem('conversations', JSON.stringify([mockConversation]));

      await hybridSendMessage(
        'conv123',
        'user1@example.com',
        'User 1',
        'user2@example.com',
        'User 2',
        'Hello'
      );

      const conversationsData = await AsyncStorage.getItem('conversations');
      const conversations = JSON.parse(conversationsData || '[]');
      expect(conversations[0].unreadCount['user2@example.com']).toBe(1);
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(
        hybridSendMessage('conv123', 'user1@example.com', 'User 1', 'user2@example.com', 'User 2', 'Hello')
      ).rejects.toThrow();

      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in outer catch block of sendMessage', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(
        hybridSendMessage('conv123', 'user1@example.com', 'User 1', 'user2@example.com', 'User 2', 'Hello')
      ).rejects.toBe('Storage error string');

      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('hybridGetMessages', () => {
    it('should get messages locally when Firebase is not configured', async () => {
      await AsyncStorage.setItem('messages', JSON.stringify([mockMessage]));

      const messages = await hybridGetMessages('conv123');

      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe('Hello');
    });

    it('should get messages via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMessages: Message[] = [{ ...mockMessage, id: 'firebase_msg123' }];
      mockGetFirebaseMessages.mockResolvedValue(firebaseMessages);

      const messages = await hybridGetMessages('conv123');

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('firebase_msg123');
      expect(messages[0].text).toBe('Hello');
      expect(mockGetFirebaseMessages).toHaveBeenCalledWith('conv123');

      // Should be cached locally
      const messagesData = await AsyncStorage.getItem('messages');
      expect(messagesData).toBeTruthy();
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockGetFirebaseMessages.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem('messages', JSON.stringify([mockMessage]));

      const messages = await hybridGetMessages('conv123');

      expect(messages).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in Firebase getMessages', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockGetFirebaseMessages.mockRejectedValue('Firebase error string');
      await AsyncStorage.setItem('messages', JSON.stringify([mockMessage]));

      const messages = await hybridGetMessages('conv123');

      expect(messages).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(hybridGetMessages('conv123')).rejects.toThrow();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in outer catch block of getMessages', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(hybridGetMessages('conv123')).rejects.toBe('Storage error string');

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('hybridGetUserConversations', () => {
    it('should get conversations locally when Firebase is not configured', async () => {
      await AsyncStorage.setItem('conversations', JSON.stringify([mockConversation]));

      const conversations = await hybridGetUserConversations('user1@example.com');

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv123');
    });

    it('should get conversations via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseConversations: Conversation[] = [{ ...mockConversation, id: 'firebase_conv123' }];
      mockGetFirebaseUserConversations.mockResolvedValue(firebaseConversations);

      const conversations = await hybridGetUserConversations('user1@example.com');

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('firebase_conv123');
      expect(mockGetFirebaseUserConversations).toHaveBeenCalledWith('user1@example.com');

      // Should be cached locally
      const conversationsData = await AsyncStorage.getItem('conversations');
      expect(conversationsData).toBeTruthy();
    });

    it('should fallback to local when Firebase fails', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockGetFirebaseUserConversations.mockRejectedValue(new Error('Firebase error'));
      await AsyncStorage.setItem('conversations', JSON.stringify([mockConversation]));

      const conversations = await hybridGetUserConversations('user1@example.com');

      expect(conversations).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in Firebase getUserConversations', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockGetFirebaseUserConversations.mockRejectedValue('Firebase error string');
      await AsyncStorage.setItem('conversations', JSON.stringify([mockConversation]));

      const conversations = await hybridGetUserConversations('user1@example.com');

      expect(conversations).toHaveLength(1);
      expect(mockLogger.logger.warn).toHaveBeenCalled();
    });

    it('should filter conversations by user email', async () => {
      const otherConversation: Conversation = {
        ...mockConversation,
        id: 'conv456',
        participants: ['user3@example.com', 'user4@example.com'],
      };
      await AsyncStorage.setItem('conversations', JSON.stringify([mockConversation, otherConversation]));

      const conversations = await hybridGetUserConversations('user1@example.com');

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv123');
    });

    it('should handle errors and throw', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(hybridGetUserConversations('user1@example.com')).rejects.toThrow();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in outer catch block of getUserConversations', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');

      await expect(hybridGetUserConversations('user1@example.com')).rejects.toBe('Storage error string');

      AsyncStorage.getItem = originalGetItem;
    });
  });
});
