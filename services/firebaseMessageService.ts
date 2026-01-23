/**
 * Firebase Message Service
 * 
 * Handles all messaging operations with Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';
import { Message, Conversation } from '@/types/types';
import { logger } from '@/utils/logger';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Generate conversation ID from two participant emails
 */
export function generateConversationId(email1: string, email2: string): string {
  // Sort emails to ensure consistent ID regardless of order
  const sorted = [email1, email2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Create or get a conversation
 */
export async function createOrGetConversation(
  user1Email: string,
  user1Name: string,
  user2Email: string,
  user2Name: string
): Promise<Conversation> {
  try {
    const db = getFirebaseFirestore();
    const conversationId = generateConversationId(user1Email, user2Email);
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      logger.info('Conversation found', { conversationId });
      return conversationSnap.data() as Conversation;
    }
    
    // Create new conversation
    const conversation: Conversation = {
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
    
    await setDoc(conversationRef, conversation);
    logger.info('Conversation created', { conversationId });
    
    return conversation;
  } catch (error) {
    logger.error('Error creating/getting conversation', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderEmail: string,
  senderName: string,
  receiverEmail: string,
  receiverName: string,
  text: string
): Promise<Message> {
  try {
    const db = getFirebaseFirestore();
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    const message: Omit<Message, 'id'> = {
      conversationId,
      senderEmail,
      senderName,
      receiverEmail,
      receiverName,
      text,
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    const docRef = await addDoc(messagesRef, message);
    
    // Update conversation with last message info
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageAt: message.createdAt,
      [`unreadCount.${receiverEmail}`]: (await getDoc(conversationRef)).data()?.unreadCount?.[receiverEmail] + 1 || 1,
      updatedAt: message.createdAt,
    });
    
    const newMessage: Message = {
      id: docRef.id,
      ...message,
    };
    
    logger.info('Message sent', { conversationId, messageId: docRef.id });
    return newMessage;
  } catch (error) {
    logger.error('Error sending message', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string, limitCount: number = 50): Promise<Message[]> {
  try {
    const db = getFirebaseFirestore();
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];
    
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });
    
    // Reverse to show oldest first
    messages.reverse();
    
    logger.info('Messages retrieved', { conversationId, count: messages.length });
    return messages;
  } catch (error) {
    logger.error('Error getting messages', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Subscribe to real-time messages
 */
export function subscribeToMessages(
  conversationId: string,
  onMessagesUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const db = getFirebaseFirestore();
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as Message);
        });
        onMessagesUpdate(messages);
        logger.info('Messages updated (real-time)', { conversationId, count: messages.length });
      },
      (error) => {
        logger.error('Error in messages subscription', error);
        if (onError) onError(error as Error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    logger.error('Error subscribing to messages', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userEmail: string): Promise<Conversation[]> {
  try {
    const db = getFirebaseFirestore();
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userEmail),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const conversations: Conversation[] = [];
    
    querySnapshot.forEach((doc) => {
      conversations.push(doc.data() as Conversation);
    });
    
    logger.info('Conversations retrieved', { userEmail, count: conversations.length });
    return conversations;
  } catch (error) {
    logger.error('Error getting conversations', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userEmail: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    await updateDoc(conversationRef, {
      [`unreadCount.${userEmail}`]: 0,
    });
    
    logger.info('Messages marked as read', { conversationId, userEmail });
  } catch (error) {
    logger.error('Error marking messages as read', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
