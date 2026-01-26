// Mock logger FIRST before any imports that use it
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Unmock connectionUtils to use actual implementation
jest.unmock('../connectionUtils');

import { areUsersMatched, getMatchedUserEmails } from '../connectionUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MentorshipRequest } from '@/types/types';

describe('connectionUtils', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('areUsersMatched', () => {
    it('should return true when users have accepted connection (requester->mentor)', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user2@example.com',
          mentorName: 'User 2',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(true);
    });

    it('should return true when users have accepted connection (mentor->requester)', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user2@example.com',
          requesterName: 'User 2',
          mentorEmail: 'user1@example.com',
          mentorName: 'User 1',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(true);
    });

    it('should return false when users have no connection', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user3@example.com',
          mentorName: 'User 3',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(false);
    });

    it('should return false when request is pending', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user2@example.com',
          mentorName: 'User 2',
          note: 'Test note',
          status: 'pending',
          createdAt: '2026-01-20T10:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(false);
    });

    it('should return false when request is declined', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user2@example.com',
          mentorName: 'User 2',
          note: 'Test note',
          status: 'declined',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(false);
    });

    it('should return false when no requests exist', async () => {
      // Don't set mentorshipRequests, so it will be null
      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // Mock getItem to throw an error
      const originalGetItem = AsyncStorage.getItem;
      (AsyncStorage.getItem as jest.Mock) = jest.fn(() => Promise.reject(new Error('Storage error')));

      const result = await areUsersMatched('user1@example.com', 'user2@example.com');
      expect(result).toBe(false);

      // Restore original
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('getMatchedUserEmails', () => {
    it('should return matched user emails for requester', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user2@example.com',
          mentorName: 'User 2',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
        {
          id: 'req2',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user3@example.com',
          mentorName: 'User 3',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await getMatchedUserEmails('user1@example.com');
      expect(result).toEqual(['user2@example.com', 'user3@example.com']);
    });

    it('should return matched user emails for mentor', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user2@example.com',
          requesterName: 'User 2',
          mentorEmail: 'user1@example.com',
          mentorName: 'User 1',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await getMatchedUserEmails('user1@example.com');
      expect(result).toEqual(['user2@example.com']);
    });

    it('should return both mentors and mentees', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user1@example.com',
          requesterName: 'User 1',
          mentorEmail: 'user2@example.com',
          mentorName: 'User 2',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
        {
          id: 'req2',
          requesterEmail: 'user3@example.com',
          requesterName: 'User 3',
          mentorEmail: 'user1@example.com',
          mentorName: 'User 1',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await getMatchedUserEmails('user1@example.com');
      expect(result).toEqual(expect.arrayContaining(['user2@example.com', 'user3@example.com']));
      expect(result.length).toBe(2);
    });

    it('should return empty array when no matches', async () => {
      const requests: MentorshipRequest[] = [
        {
          id: 'req1',
          requesterEmail: 'user2@example.com',
          requesterName: 'User 2',
          mentorEmail: 'user3@example.com',
          mentorName: 'User 3',
          note: 'Test note',
          status: 'accepted',
          createdAt: '2026-01-20T10:00:00Z',
          respondedAt: '2026-01-20T11:00:00Z',
        },
      ];

      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify(requests));

      const result = await getMatchedUserEmails('user1@example.com');
      expect(result).toEqual([]);
    });

    it('should return empty array when no requests exist', async () => {
      // Don't set mentorshipRequests, so it will be null
      const result = await getMatchedUserEmails('user1@example.com');
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Mock getItem to throw an error
      const originalGetItem = AsyncStorage.getItem;
      (AsyncStorage.getItem as jest.Mock) = jest.fn(() => Promise.reject(new Error('Storage error')));

      const result = await getMatchedUserEmails('user1@example.com');
      expect(result).toEqual([]);

      // Restore original
      AsyncStorage.getItem = originalGetItem;
    });
  });
});
