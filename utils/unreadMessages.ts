import { Conversation } from '@/types/types';

const normalize = (s: string | undefined | null): string =>
  (s || '').trim().toLowerCase();

const getMapValueByEmail = (
  map: Record<string, unknown> | undefined,
  email: string
): unknown => {
  if (!map || typeof map !== 'object') return undefined;
  const norm = normalize(email);
  for (const [key, val] of Object.entries(map)) {
    if (normalize(key) === norm) return val;
  }
  return undefined;
};

/**
 * Case-insensitive unread lookup; coerce to number (Firestore may return string on Android).
 */
export function getUnreadForUser(conversation: Conversation, userEmail: string): number {
  const norm = normalize(userEmail);
  const unreadRaw = getMapValueByEmail(conversation?.unreadCount as Record<string, unknown>, norm);
  const unread = typeof unreadRaw === 'number' ? unreadRaw : parseInt(String(unreadRaw ?? 0), 10);
  const safeUnread = Number.isNaN(unread) ? 0 : Math.max(0, unread);
  if (safeUnread > 0) return safeUnread;

  // Fallback for legacy/corrupted unreadCount data:
  // if the last message is from someone else and happened after this user's last read timestamp,
  // show a minimal indicator of 1 unread so badge/pill still appear.
  const sender = normalize(conversation?.lastMessageSenderEmail);
  if (!sender || sender === norm) return 0;
  const lastMessageTime = Date.parse(conversation?.lastMessageAt || conversation?.updatedAt || '');
  if (!Number.isFinite(lastMessageTime)) return 0;
  const lastReadRaw = getMapValueByEmail(conversation?.lastReadAt as Record<string, unknown>, norm);
  const lastReadTime = Date.parse(String(lastReadRaw || ''));
  if (!Number.isFinite(lastReadTime)) return 1;
  return lastMessageTime > lastReadTime ? 1 : 0;
}

export function getTotalUnread(conversations: Conversation[], userEmail: string): number {
  return conversations.reduce((sum, c) => sum + getUnreadForUser(c, userEmail), 0);
}
