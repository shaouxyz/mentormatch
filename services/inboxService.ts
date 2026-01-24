/**
 * Inbox Service
 * 
 * Handles inbox items (notifications, invitation codes, etc.)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InboxItem } from '@/types/types';
import { logger } from '@/utils/logger';
import { isFirebaseConfigured } from '@/config/firebase.config';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';

const INBOX_KEY = 'inbox';
const INBOX_COLLECTION = 'inbox';

/**
 * Get inbox items from local storage
 */
async function getLocalInboxItems(): Promise<InboxItem[]> {
  try {
    const inboxData = await AsyncStorage.getItem(INBOX_KEY);
    return inboxData ? JSON.parse(inboxData) : [];
  } catch (error) {
    logger.error('Error getting local inbox items', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Save inbox items to local storage
 */
async function saveLocalInboxItems(items: InboxItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(items));
  } catch (error) {
    logger.error('Error saving local inbox items', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Add an item to inbox
 */
export async function addInboxItem(item: Omit<InboxItem, 'id' | 'read' | 'createdAt'>): Promise<InboxItem> {
  try {
    const inboxItem: InboxItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const inboxRef = collection(db, INBOX_COLLECTION);
        const docRef = doc(inboxRef);
        
        await setDoc(docRef, {
          ...inboxItem,
          id: docRef.id,
        });
        
        inboxItem.id = docRef.id;
        logger.info('Inbox item added to Firestore', { itemId: docRef.id, recipientEmail: item.recipientEmail });
      } catch (firebaseError) {
        logger.warn('Failed to add inbox item to Firestore, using local only', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Save locally
    const localItems = await getLocalInboxItems();
    localItems.push(inboxItem);
    await saveLocalInboxItems(localItems);

    logger.info('Inbox item added', { recipientEmail: item.recipientEmail, type: item.type });
    return inboxItem;
  } catch (error) {
    logger.error('Error adding inbox item', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get inbox items for a user
 */
export async function getInboxItems(userEmail: string): Promise<InboxItem[]> {
  try {
    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const inboxRef = collection(db, INBOX_COLLECTION);
        const q = query(
          inboxRef,
          where('recipientEmail', '==', userEmail),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const querySnapshot = await getDocs(q);
        
        const items: InboxItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as InboxItem);
        });
        
        // Also sync to local
        await saveLocalInboxItems(items);
        
        logger.info('Inbox items retrieved from Firestore', { userEmail, count: items.length });
        return items;
      } catch (firebaseError) {
        logger.warn('Failed to get inbox items from Firestore, trying local', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Local-only mode
    const localItems = await getLocalInboxItems();
    const userItems = localItems
      .filter(item => item.recipientEmail === userEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    logger.info('Inbox items retrieved locally', { userEmail, count: userItems.length });
    return userItems;
  } catch (error) {
    logger.error('Error getting inbox items', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Mark inbox item as read
 */
export async function markInboxItemAsRead(itemId: string): Promise<void> {
  try {
    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const itemRef = doc(db, INBOX_COLLECTION, itemId);
        await updateDoc(itemRef, { read: true });
        logger.info('Inbox item marked as read in Firestore', { itemId });
      } catch (firebaseError) {
        logger.warn('Failed to mark inbox item as read in Firestore, trying local', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Update locally
    const localItems = await getLocalInboxItems();
    const itemIndex = localItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      localItems[itemIndex].read = true;
      await saveLocalInboxItems(localItems);
      logger.info('Inbox item marked as read locally', { itemId });
    }
  } catch (error) {
    logger.error('Error marking inbox item as read', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get unread inbox count
 */
export async function getUnreadInboxCount(userEmail: string): Promise<number> {
  try {
    const items = await getInboxItems(userEmail);
    return items.filter(item => !item.read).length;
  } catch (error) {
    logger.error('Error getting unread inbox count', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Add invitation code to inbox
 */
export async function addInvitationCodeToInbox(
  recipientEmail: string,
  invitationCode: string,
  createdBy: string
): Promise<void> {
  try {
    await addInboxItem({
      recipientEmail,
      type: 'invitation_code',
      title: 'New Invitation Code',
      message: `You've received a new invitation code! Share it with someone to invite them to MentorMatch.`,
      invitationCode,
    });
    logger.info('Invitation code added to inbox', { recipientEmail, code: invitationCode });
  } catch (error) {
    logger.error('Error adding invitation code to inbox', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
