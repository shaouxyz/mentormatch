/**
 * Hybrid Meeting Service Tests
 * 
 * Tests for services/hybridMeetingService.ts - hybrid meeting management
 */

// Unmock the service we're testing
jest.unmock('../hybridMeetingService');

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hybridCreateMeeting,
  hybridGetMeeting,
  hybridUpdateMeeting,
  hybridDeleteMeeting,
  hybridGetUserMeetings,
  hybridGetPendingMeetings,
  hybridGetUpcomingMeetings,
  hybridSubscribeToMeetings,
} from '../hybridMeetingService';
import { Meeting } from '../../types/types';
import * as firebaseConfig from '../../config/firebase.config';
import * as firebaseMeetingService from '../firebaseMeetingService';
import * as logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../config/firebase.config');
jest.mock('../firebaseMeetingService');
jest.mock('../../utils/logger');

const mockFirebaseConfig = firebaseConfig as any;
const mockFirebaseMeetingService = firebaseMeetingService as any;
const mockLogger = logger as any;

describe('Hybrid Meeting Service', () => {
  const mockMeeting: Omit<Meeting, 'id'> = {
    organizerEmail: 'organizer@example.com',
    organizerName: 'Organizer',
    participantEmail: 'participant@example.com',
    participantName: 'Participant',
    title: 'Test Meeting',
    description: 'Test Description',
    date: '2024-12-31T10:00:00.000Z',
    time: '2024-12-31T10:00:00.000Z',
    duration: 60,
    location: 'Test Location',
    locationType: 'in-person',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(false);
  });

  describe('hybridCreateMeeting', () => {
    it('should create meeting locally when Firebase is not configured', async () => {
      const meeting = await hybridCreateMeeting(mockMeeting);
      
      expect(meeting.id).toMatch(/^local_\d+$/);
      expect(meeting.title).toBe(mockMeeting.title);
      expect(meeting.status).toBe('pending');
      
      const localMeetings = await AsyncStorage.getItem('meetings');
      expect(localMeetings).toBeTruthy();
      const meetings = JSON.parse(localMeetings || '[]');
      expect(meetings).toHaveLength(1);
    });

    it('should create meeting via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMeeting: Meeting = { ...mockMeeting, id: 'firebase123' };
      mockFirebaseMeetingService.createMeetingRequest.mockResolvedValue(firebaseMeeting);
      
      const meeting = await hybridCreateMeeting(mockMeeting);
      
      expect(meeting.id).toBe('firebase123');
      expect(mockFirebaseMeetingService.createMeetingRequest).toHaveBeenCalledWith(mockMeeting);
      
      // Should also be cached locally
      const localMeetings = await AsyncStorage.getItem('meetings');
      const meetings = JSON.parse(localMeetings || '[]');
      expect(meetings).toHaveLength(1);
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(hybridCreateMeeting(mockMeeting)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in hybridCreateMeeting', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');
      
      await expect(hybridCreateMeeting(mockMeeting)).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('hybridGetMeeting', () => {
    it('should get meeting locally when Firebase is not configured', async () => {
      const localMeeting: Meeting = { ...mockMeeting, id: 'local123' };
      await AsyncStorage.setItem('meetings', JSON.stringify([localMeeting]));
      
      const meeting = await hybridGetMeeting('local123');
      
      expect(meeting).toEqual(localMeeting);
    });

    it('should get meeting via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMeeting: Meeting = { ...mockMeeting, id: 'firebase123' };
      mockFirebaseMeetingService.getMeeting.mockResolvedValue(firebaseMeeting);
      
      const meeting = await hybridGetMeeting('firebase123');
      
      expect(meeting).toEqual(firebaseMeeting);
      expect(mockFirebaseMeetingService.getMeeting).toHaveBeenCalledWith('firebase123');
    });

    it('should return null when meeting not found locally', async () => {
      const meeting = await hybridGetMeeting('nonexistent');
      expect(meeting).toBeNull();
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getMeeting.mockRejectedValue(new Error('Firebase error'));
      
      await expect(hybridGetMeeting('firebase123')).rejects.toThrow();
    });

    it('should handle non-Error thrown in hybridGetMeeting', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getMeeting.mockRejectedValue('Firebase error string');
      
      await expect(hybridGetMeeting('firebase123')).rejects.toBe('Firebase error string');
    });
  });

  describe('hybridUpdateMeeting', () => {
    it('should update meeting locally when Firebase is not configured', async () => {
      const localMeeting: Meeting = { ...mockMeeting, id: 'local123' };
      await AsyncStorage.setItem('meetings', JSON.stringify([localMeeting]));
      
      await hybridUpdateMeeting('local123', { status: 'accepted' });
      
      const meetingsData = await AsyncStorage.getItem('meetings');
      const meetings = JSON.parse(meetingsData || '[]');
      expect(meetings[0].status).toBe('accepted');
      expect(meetings[0].updatedAt).toBeTruthy();
    });

    it('should update meeting via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const localMeeting: Meeting = { ...mockMeeting, id: 'firebase123' };
      await AsyncStorage.setItem('meetings', JSON.stringify([localMeeting]));
      mockFirebaseMeetingService.updateMeeting.mockResolvedValue(undefined);
      
      await hybridUpdateMeeting('firebase123', { status: 'accepted' });
      
      expect(mockFirebaseMeetingService.updateMeeting).toHaveBeenCalledWith('firebase123', { status: 'accepted' });
      
      // Should also update locally
      const meetingsData = await AsyncStorage.getItem('meetings');
      const meetings = JSON.parse(meetingsData || '[]');
      expect(meetings[0].status).toBe('accepted');
    });

    it('should throw error when meeting not found locally', async () => {
      await expect(hybridUpdateMeeting('nonexistent', { status: 'accepted' })).rejects.toThrow('Meeting not found');
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.updateMeeting.mockRejectedValue(new Error('Firebase error'));
      
      await expect(hybridUpdateMeeting('firebase123', { status: 'accepted' })).rejects.toThrow();
    });

    it('should not update locally when meeting not found in local storage during Firebase update', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      // No meetings in local storage
      await AsyncStorage.setItem('meetings', JSON.stringify([]));
      mockFirebaseMeetingService.updateMeeting.mockResolvedValue(undefined);
      
      await hybridUpdateMeeting('firebase123', { status: 'accepted' });
      
      expect(mockFirebaseMeetingService.updateMeeting).toHaveBeenCalledWith('firebase123', { status: 'accepted' });
      // Local storage should remain empty (index === -1, so no update)
      const meetingsData = await AsyncStorage.getItem('meetings');
      const meetings = JSON.parse(meetingsData || '[]');
      expect(meetings).toHaveLength(0);
    });

    it('should handle non-Error thrown in hybridUpdateMeeting', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.updateMeeting.mockRejectedValue('Firebase error string');
      
      await expect(hybridUpdateMeeting('firebase123', { status: 'accepted' })).rejects.toBe('Firebase error string');
    });
  });

  describe('hybridDeleteMeeting', () => {
    it('should delete meeting locally when Firebase is not configured', async () => {
      const localMeeting: Meeting = { ...mockMeeting, id: 'local123' };
      await AsyncStorage.setItem('meetings', JSON.stringify([localMeeting]));
      
      await hybridDeleteMeeting('local123');
      
      const meetingsData = await AsyncStorage.getItem('meetings');
      const meetings = JSON.parse(meetingsData || '[]');
      expect(meetings).toHaveLength(0);
    });

    it('should delete meeting via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const localMeeting: Meeting = { ...mockMeeting, id: 'firebase123' };
      await AsyncStorage.setItem('meetings', JSON.stringify([localMeeting]));
      mockFirebaseMeetingService.deleteMeeting.mockResolvedValue(undefined);
      
      await hybridDeleteMeeting('firebase123');
      
      expect(mockFirebaseMeetingService.deleteMeeting).toHaveBeenCalledWith('firebase123');
      
      // Should also delete locally
      const meetingsData = await AsyncStorage.getItem('meetings');
      const meetings = JSON.parse(meetingsData || '[]');
      expect(meetings).toHaveLength(0);
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.deleteMeeting.mockRejectedValue(new Error('Firebase error'));
      
      await expect(hybridDeleteMeeting('firebase123')).rejects.toThrow();
    });

    it('should handle non-Error thrown in hybridDeleteMeeting', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.deleteMeeting.mockRejectedValue('Firebase error string');
      
      await expect(hybridDeleteMeeting('firebase123')).rejects.toBe('Firebase error string');
    });
  });

  describe('hybridGetUserMeetings', () => {
    it('should get user meetings locally when Firebase is not configured', async () => {
      const meetings: Meeting[] = [
        { ...mockMeeting, id: '1', organizerEmail: 'user@example.com', date: '2024-12-31T10:00:00.000Z' },
        { ...mockMeeting, id: '2', participantEmail: 'user@example.com', date: '2024-12-30T10:00:00.000Z' },
        { ...mockMeeting, id: '3', organizerEmail: 'other@example.com', date: '2024-12-29T10:00:00.000Z' },
      ];
      await AsyncStorage.setItem('meetings', JSON.stringify(meetings));
      
      const userMeetings = await hybridGetUserMeetings('user@example.com');
      
      expect(userMeetings).toHaveLength(2);
      expect(userMeetings[0].id).toBe('2'); // Sorted by date
      expect(userMeetings[1].id).toBe('1');
    });

    it('should get user meetings via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMeetings: Meeting[] = [
        { ...mockMeeting, id: '1', organizerEmail: 'user@example.com' },
      ];
      mockFirebaseMeetingService.getUserMeetings.mockResolvedValue(firebaseMeetings);
      
      const userMeetings = await hybridGetUserMeetings('user@example.com');
      
      expect(userMeetings).toEqual(firebaseMeetings);
      expect(mockFirebaseMeetingService.getUserMeetings).toHaveBeenCalledWith('user@example.com');
      
      // Should be cached locally
      const localMeetings = await AsyncStorage.getItem('meetings');
      expect(localMeetings).toBeTruthy();
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getUserMeetings.mockRejectedValue(new Error('Firebase error'));
      
      await expect(hybridGetUserMeetings('user@example.com')).rejects.toThrow();
    });

    it('should handle non-Error thrown in hybridGetUserMeetings', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getUserMeetings.mockRejectedValue('Firebase error string');
      
      await expect(hybridGetUserMeetings('user@example.com')).rejects.toBe('Firebase error string');
    });
  });

  describe('hybridGetPendingMeetings', () => {
    it('should get pending meetings locally when Firebase is not configured', async () => {
      const meetings: Meeting[] = [
        { ...mockMeeting, id: '1', participantEmail: 'user@example.com', status: 'pending', createdAt: '2024-01-01T00:00:00.000Z' },
        { ...mockMeeting, id: '2', participantEmail: 'user@example.com', status: 'accepted', createdAt: '2024-01-02T00:00:00.000Z' },
        { ...mockMeeting, id: '3', participantEmail: 'user@example.com', status: 'pending', createdAt: '2024-01-03T00:00:00.000Z' },
      ];
      await AsyncStorage.setItem('meetings', JSON.stringify(meetings));
      
      const pendingMeetings = await hybridGetPendingMeetings('user@example.com');
      
      expect(pendingMeetings).toHaveLength(2);
      expect(pendingMeetings[0].id).toBe('3'); // Sorted by createdAt desc
      expect(pendingMeetings[1].id).toBe('1');
    });

    it('should get pending meetings via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMeetings: Meeting[] = [
        { ...mockMeeting, id: '1', participantEmail: 'user@example.com', status: 'pending' },
      ];
      mockFirebaseMeetingService.getPendingMeetingRequests.mockResolvedValue(firebaseMeetings);
      
      const pendingMeetings = await hybridGetPendingMeetings('user@example.com');
      
      expect(pendingMeetings).toEqual(firebaseMeetings);
      expect(mockFirebaseMeetingService.getPendingMeetingRequests).toHaveBeenCalledWith('user@example.com');
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getPendingMeetingRequests.mockRejectedValue(new Error('Firebase error'));
      
      await expect(hybridGetPendingMeetings('user@example.com')).rejects.toThrow();
    });

    it('should handle non-Error thrown in hybridGetPendingMeetings', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getPendingMeetingRequests.mockRejectedValue('Firebase error string');
      
      await expect(hybridGetPendingMeetings('user@example.com')).rejects.toBe('Firebase error string');
    });
  });

  describe('hybridGetUpcomingMeetings', () => {
    it('should get upcoming meetings locally when Firebase is not configured', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const meetings: Meeting[] = [
        { ...mockMeeting, id: '1', organizerEmail: 'user@example.com', status: 'accepted', date: futureDate.toISOString() },
        { ...mockMeeting, id: '2', participantEmail: 'user@example.com', status: 'accepted', date: futureDate.toISOString() },
        { ...mockMeeting, id: '3', organizerEmail: 'user@example.com', status: 'accepted', date: pastDate.toISOString() },
        { ...mockMeeting, id: '4', organizerEmail: 'user@example.com', status: 'pending', date: futureDate.toISOString() },
      ];
      await AsyncStorage.setItem('meetings', JSON.stringify(meetings));
      
      const upcomingMeetings = await hybridGetUpcomingMeetings('user@example.com');
      
      expect(upcomingMeetings).toHaveLength(2);
      expect(upcomingMeetings.every(m => m.status === 'accepted')).toBe(true);
      expect(upcomingMeetings.every(m => new Date(m.date) >= new Date())).toBe(true);
    });

    it('should get upcoming meetings via Firebase when configured', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const firebaseMeetings: Meeting[] = [
        { ...mockMeeting, id: '1', organizerEmail: 'user@example.com', status: 'accepted' },
      ];
      mockFirebaseMeetingService.getUpcomingMeetings.mockResolvedValue(firebaseMeetings);
      
      const upcomingMeetings = await hybridGetUpcomingMeetings('user@example.com');
      
      expect(upcomingMeetings).toEqual(firebaseMeetings);
      expect(mockFirebaseMeetingService.getUpcomingMeetings).toHaveBeenCalledWith('user@example.com');
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getUpcomingMeetings.mockRejectedValue(new Error('Firebase error'));
      
      await expect(hybridGetUpcomingMeetings('user@example.com')).rejects.toThrow();
    });

    it('should handle non-Error thrown in hybridGetUpcomingMeetings', async () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      mockFirebaseMeetingService.getUpcomingMeetings.mockRejectedValue('Firebase error string');
      
      await expect(hybridGetUpcomingMeetings('user@example.com')).rejects.toBe('Firebase error string');
    });
  });

  describe('hybridSubscribeToMeetings', () => {
    it('should subscribe via Firebase when configured', () => {
      mockFirebaseConfig.isFirebaseConfigured.mockReturnValue(true);
      const unsubscribe = jest.fn();
      mockFirebaseMeetingService.subscribeToUserMeetings.mockReturnValue(unsubscribe);
      
      const callback = jest.fn();
      const result = hybridSubscribeToMeetings('user@example.com', callback);
      
      expect(mockFirebaseMeetingService.subscribeToUserMeetings).toHaveBeenCalledWith('user@example.com', callback);
      expect(result).toBe(unsubscribe);
    });

    it('should load locally and call callback when Firebase is not configured', async () => {
      const localMeeting: Meeting = { ...mockMeeting, id: 'local123', organizerEmail: 'user@example.com' };
      await AsyncStorage.setItem('meetings', JSON.stringify([localMeeting]));
      
      const callback = jest.fn();
      const result = hybridSubscribeToMeetings('user@example.com', callback);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(callback).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Function);
      
      // Test unsubscribe
      result();
      expect(mockLogger.logger.info).toHaveBeenCalledWith('Local meeting subscription unsubscribed');
    });

    it('should handle error in local subscription callback', async () => {
      // Mock AsyncStorage.getItem to throw error in getLocalMeetings
      // This will cause getLocalMeetings to return [] (error handling)
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const callback = jest.fn();
      const result = hybridSubscribeToMeetings('user@example.com', callback);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Callback should be called with empty array (getLocalMeetings returns [] on error)
      expect(callback).toHaveBeenCalledWith([]);
      expect(result).toBeInstanceOf(Function);

      AsyncStorage.getItem = originalGetItem;
    });
  });
});
