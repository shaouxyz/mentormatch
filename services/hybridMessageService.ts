/**
 * Hybrid Message Service
 * 
 * Provides a unified messaging interface that:
 * - Always saves to AsyncStorage (for offline support)
 * - Optionally syncs to Firebase (if configured)
 * - Gracefully handles Firebase errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/config/firebase.config';
import {
  createOrGetConversation as createOrGetFirebaseConversation,
  sendMessage as sendFirebaseMessage,
  getMessages as getFirebaseMessages,
  getUserConversations as getFirebaseUserConversations,
  markMessagesAsRead as markFirebaseMessagesAsRead,
  subscribeToMessages,
  generateConversationId,
} from './firebaseMessageService';
import { Message, Conversation } from '@/types/types';
import { logger } from '@/utils/logger';

const STORAGE_KEYS = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
};

/**
 * Create or get a conversation (hybrid: local + Firebase)
 */
export async function hybridCreateOrGetConversation(
  user1Email: string,
  user1Name: string,
  user2Email: string,
  user2Name: string
): Promise<Conversation> {
  try {
    const conversationId = generateConversationId(user1Email, user2Email);
    
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const conversation = await createOrGetFirebaseConversation(user1Email, user1Name, user2Email, user2Name);
        
        // Save to local storage as cache
        await saveConversationLocally(conversation);
        
        logger.info('Conversation created/retrieved from Firebase', { conversationId });
        return conversation;
      } catch (firebaseError) {
        logger.warn('Failed to create/get conversation from Firebase, using local only', {
          conversationId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage
    return await getOrCreateLocalConversation(conversationId, user1Email, user1Name, user2Email, user2Name);
  } catch (error) {
    logger.error('Error in hybrid create/get conversation', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Send a message (hybrid: local + Firebase)
 */
export async function hybridSendMessage(
  conversationId: string,
  senderEmail: string,
  senderName: string,
  receiverEmail: string,
  receiverName: string,
  text: string
): Promise<Message> {
  try {
    // Create local message first
    const localMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      conversationId,
      senderEmail,
      senderName,
      receiverEmail,
      receiverName,
      text,
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    // Save locally first
    await saveMessageLocally(localMessage);
    logger.info('Message saved locally', { conversationId, messageId: localMessage.id });
    
    // Try to sync to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        const firebaseMessage = await sendFirebaseMessage(
          conversationId,
          senderEmail,
          senderName,
          receiverEmail,
          receiverName,
          text
        );
        logger.info('Message synced to Firebase', { conversationId, messageId: firebaseMessage.id });
        return firebaseMessage;
      } catch (firebaseError) {
        logger.warn('Failed to sync message to Firebase, continuing with local only', {
          conversationId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    return localMessage;
  } catch (error) {
    logger.error('Error in hybrid send message', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get messages (hybrid: Firebase with local fallback)
 */
export async function hybridGetMessages(conversationId: string): Promise<Message[]> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const messages = await getFirebaseMessages(conversationId);
        
        // Cache locally
        await saveMessagesLocally(conversationId, messages);
        
        logger.info('Messages retrieved from Firebase', { conversationId, count: messages.length });
        return messages;
      } catch (firebaseError) {
        logger.warn('Failed to get messages from Firebase, using local', {
          conversationId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage
    return await getLocalMessages(conversationId);
  } catch (error) {
    logger.error('Error in hybrid get messages', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get user conversations (hybrid: Firebase with local fallback)
 */
export async function hybridGetUserConversations(userEmail: string): Promise<Conversation[]> {
  try {
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const conversations = await getFirebaseUserConversations(userEmail);
        
        // Cache locally
        for (const conversation of conversations) {
          await saveConversationLocally(conversation);
        }
        
        logger.info('Conversations retrieved from Firebase', { userEmail, count: conversations.length });
        return conversations;
      } catch (firebaseError) {
        logger.warn('Failed to get conversations from Firebase, using local', {
          userEmail,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }
    
    // Fallback to local storage
    return await getLocalUserConversations(userEmail);
  } catch (error) {
    logger.error('Error in hybrid get conversations', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Local storage helpers

async function saveConversationLocally(conversation: Conversation): Promise<void> {
  const conversationsData = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  let conversations: Conversation[] = conversationsData ? JSON.parse(conversationsData) : [];
  
  // Remove existing conversation with same ID
  conversations = conversations.filter(c => c.id !== conversation.id);
  conversations.push(conversation);
  
  await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
}

async function saveMessageLocally(message: Message): Promise<void> {
  const messagesData = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
  let messages: Message[] = messagesData ? JSON.parse(messagesData) : [];
  
  messages.push(message);
  await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  
  // Update conversation's last message
  const conversationsData = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  if (conversationsData) {
    let conversations: Conversation[] = JSON.parse(conversationsData);
    const conversationIndex = conversations.findIndex(c => c.id === message.conversationId);
    
    if (conversationIndex !== -1) {
      conversations[conversationIndex].lastMessage = message.text;
      conversations[conversationIndex].lastMessageAt = message.createdAt;
      conversations[conversationIndex].updatedAt = message.createdAt;
      
      // Increment unread count for receiver
      if (!conversations[conversationIndex].unreadCount) {
        conversations[conversationIndex].unreadCount = {};
      }
      conversations[conversationIndex].unreadCount[message.receiverEmail] = 
        (conversations[conversationIndex].unreadCount[message.receiverEmail] || 0) + 1;
      
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }
  }
}

async function saveMessagesLocally(conversationId: string, messages: Message[]): Promise<void> {
  const messagesData = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
  let allMessages: Message[] = messagesData ? JSON.parse(messagesData) : [];
  
  // Remove existing messages for this conversation
  allMessages = allMessages.filter(m => m.conversationId !== conversationId);
  
  // Add new messages
  allMessages.push(...messages);
  
  await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
}

async function getLocalMessages(conversationId: string): Promise<Message[]> {
  const messagesData = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
  if (!messagesData) return [];
  
  const allMessages: Message[] = JSON.parse(messagesData);
  return allMessages
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function getOrCreateLocalConversation(
  conversationId: string,
  user1Email: string,
  user1Name: string,
  user2Email: string,
  user2Name: string
): Promise<Conversation> {
  const conversationsData = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  let conversations: Conversation[] = conversationsData ? JSON.parse(conversationsData) : [];
  
  let conversation = conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    conversation = {
      id: conversationId,
      participants: [user1Email, user2Email],
      participantNames: {
        [user1Email]: user1Name,
        [user2Email]: user2Name,
      },
      unreadCount: {
        [user1Email]: 0,
        [user2Email]: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    conversations.push(conversation);
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    logger.info('Conversation created locally', { conversationId });
  }
  
  return conversation;
}

async function getLocalUserConversations(userEmail: string): Promise<Conversation[]> {
  const conversationsData = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  if (!conversationsData) return [];
  
  const allConversations: Conversation[] = JSON.parse(conversationsData);
  return allConversations
    .filter(c => c.participants.includes(userEmail))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export { subscribeToMessages, generateConversationId };
