import { Conversation } from '@/types/types';

/**
 * Case-insensitive unread lookup; coerce to number (Firestore may return string on Android).
 */
export function getUnreadForUser(conversation: Conversation, userEmail: string): number {
  const u = conversation?.unreadCount;
  if (!u || typeof u !== 'object') return 0;
  const norm = (userEmail || '').trim().toLowerCase();
  for (const [key, val] of Object.entries(u)) {
    if ((key || '').trim().toLowerCase() === norm) {
      const n = typeof val === 'number' ? val : parseInt(String(val), 10);
      return Number.isNaN(n) ? 0 : Math.max(0, n);
    }
  }
  return 0;
}

export function getTotalUnread(conversations: Conversation[], userEmail: string): number {
  return conversations.reduce((sum, c) => sum + getUnreadForUser(c, userEmail), 0);
}
