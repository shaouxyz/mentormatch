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
  FieldPath,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';
import { getCurrentFirebaseUser } from '@/services/firebaseAuthService';
import { Message, Conversation } from '@/types/types';
import { logger } from '@/utils/logger';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/** Normalize email for Firestore (Auth token uses lowercase) */
function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function getMapValueByEmail(
  map: Record<string, unknown> | undefined,
  email: string
): unknown {
  if (!map || typeof map !== 'object') return undefined;
  const norm = normalizeEmail(email);
  for (const [key, val] of Object.entries(map)) {
    if (normalizeEmail(key) === norm) return val;
  }
  return undefined;
}

/**
 * Generate conversation ID from two participant emails
 */
export function generateConversationId(email1: string, email2: string): string {
  const e1 = normalizeEmail(email1);
  const e2 = normalizeEmail(email2);
  const sorted = [e1, e2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/** Normalize a conversation ID (e.g. from route params) so it matches stored docs */
function normalizeConversationId(conversationId: string): string {
  const parts = conversationId.split('_');
  if (parts.length >= 2) return generateConversationId(parts[0], parts[1]);
  return conversationId;
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
    const u1 = normalizeEmail(user1Email);
    const u2 = normalizeEmail(user2Email);
    const db = getFirebaseFirestore();
    const conversationId = generateConversationId(u1, u2);
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    const nowIso = new Date().toISOString();
    const conversation: Conversation = {
      id: conversationId,
      participants: [u1, u2],
      participantNames: {
        [u1]: user1Name,
        [u2]: user2Name,
      },
      unreadCount: {
        [u1]: 0,
        [u2]: 0,
      },
      // Initialize lastReadAt to now so fallback unread logic starts from a known baseline.
      lastReadAt: {
        [u1]: nowIso,
        [u2]: nowIso,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let conversationSnap;
    try {
      conversationSnap = await getDoc(conversationRef);
    } catch (getError: unknown) {
      // Permission denied can happen if doc exists with non-normalized participants; overwrite with normalized data
      const msg = getError instanceof Error ? getError.message : String(getError);
      if (msg.includes('permission') || msg.includes('Permission')) {
        logger.info('Conversation get denied (likely casing), overwriting with normalized', { conversationId });
        await setDoc(conversationRef, conversation);
        return conversation;
      }
      throw getError;
    }

    if (conversationSnap.exists()) {
      const existing = conversationSnap.data() as Conversation;

      // Repair participantNames if any name was missing/empty and the caller now provides it.
      // Case-insensitive lookup: stored keys may differ in casing from the normalized email.
      const names = existing.participantNames || {};
      const findName = (email: string): string => {
        if (names[email]) return names[email];
        const entry = Object.entries(names).find(
          ([k]) => (k || '').trim().toLowerCase() === email.trim().toLowerCase()
        );
        return entry ? entry[1] : '';
      };
      const u1Existing = findName(u1);
      const u2Existing = findName(u2);
      const u1NeedsUpdate = user1Name && (!u1Existing || u1Existing === 'Unknown');
      const u2NeedsUpdate = user2Name && (!u2Existing || u2Existing === 'Unknown');

      if (u1NeedsUpdate || u2NeedsUpdate) {
        try {
          // Use FieldPath for each key since emails contain dots
          const updates: [FieldPath, string][] = [];
          if (u1NeedsUpdate) updates.push([new FieldPath('participantNames', u1), user1Name]);
          if (u2NeedsUpdate) updates.push([new FieldPath('participantNames', u2), user2Name]);

          if (updates.length === 1) {
            await updateDoc(conversationRef, updates[0][0], updates[0][1]);
          } else if (updates.length === 2) {
            await updateDoc(conversationRef, updates[0][0], updates[0][1], updates[1][0], updates[1][1]);
          }
          // Update the in-memory object to return correct names
          if (!existing.participantNames) existing.participantNames = {};
          if (u1NeedsUpdate) existing.participantNames[u1] = user1Name;
          if (u2NeedsUpdate) existing.participantNames[u2] = user2Name;
          logger.info('Conversation participantNames repaired', { conversationId, u1NeedsUpdate, u2NeedsUpdate });
        } catch (updateError) {
          logger.warn('Failed to repair participantNames', {
            conversationId,
            error: updateError instanceof Error ? updateError.message : String(updateError),
          });
        }
      }

      logger.info('Conversation found', { conversationId });
      return existing;
    }
    
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
    // Use Firebase Auth email when signed in so Firestore rules allow create
    const currentUser = getCurrentFirebaseUser();
    const sender = currentUser?.email ?? normalizeEmail(senderEmail);
    const receiver = normalizeEmail(receiverEmail);

    const db = getFirebaseFirestore();
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    const cid = normalizeConversationId(conversationId);
    const message: Omit<Message, 'id'> = {
      conversationId: cid,
      senderEmail: sender,
      senderName,
      receiverEmail: receiver,
      receiverName,
      text,
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    const docRef = await addDoc(messagesRef, message);
    
    // Update conversation with last message info.
    // IMPORTANT: Use FieldPath for unreadCount keys because emails contain dots,
    // and Firestore interprets dots in string keys as nested field paths.
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, cid);
    const convData = (await getDoc(conversationRef)).data();
    const prevUnreadRaw = getMapValueByEmail(convData?.unreadCount as Record<string, unknown>, receiver);
    const prevUnreadParsed = typeof prevUnreadRaw === 'number' ? prevUnreadRaw : parseInt(String(prevUnreadRaw ?? 0), 10);
    const prevUnread = Number.isNaN(prevUnreadParsed) ? 0 : Math.max(0, prevUnreadParsed);
    await updateDoc(conversationRef,
      'lastMessage', text,
      'lastMessageAt', message.createdAt,
      'lastMessageSenderEmail', sender,
      new FieldPath('unreadCount', receiver), prevUnread + 1,
      'updatedAt', message.createdAt,
    );
    
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
    const cid = normalizeConversationId(conversationId);
    const db = getFirebaseFirestore();
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    const q = query(
      messagesRef,
      where('conversationId', '==', cid),
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
    
    logger.info('Messages retrieved', { conversationId: cid, count: messages.length });
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
    const cid = normalizeConversationId(conversationId);
    const db = getFirebaseFirestore();
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    const q = query(
      messagesRef,
      where('conversationId', '==', cid),
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
    const normalizedEmail = normalizeEmail(userEmail);
    const db = getFirebaseFirestore();
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', normalizedEmail),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const conversations: Conversation[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      conversations.push({
        ...data,
        id: (data?.id as string) || docSnap.id,
      } as Conversation);
    });
    
    logger.info('Conversations retrieved', { userEmail: normalizedEmail, count: conversations.length });
    return conversations;
  } catch (error) {
    logger.error('Error getting conversations', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Mark messages as read (uses normalized email so key matches unreadCount from sendMessage).
 */
export async function markMessagesAsRead(conversationId: string, userEmail: string): Promise<void> {
  try {
    const normalized = normalizeEmail(userEmail);
    const db = getFirebaseFirestore();
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    // Use FieldPath because email keys contain dots (e.g. user@gmail.com),
    // and dot-notation in updateDoc would be treated as nested field paths.
    const nowIso = new Date().toISOString();
    await updateDoc(conversationRef,
      new FieldPath('unreadCount', normalized), 0,
      new FieldPath('lastReadAt', normalized), nowIso,
    );
    
    logger.info('Messages marked as read', { conversationId, userEmail: normalized });
  } catch (error) {
    logger.error('Error marking messages as read', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
