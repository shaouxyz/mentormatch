/**
 * Tests for Hybrid Profile Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Unmock the hybrid services to test them directly
jest.unmock('../hybridAuthService');
jest.unmock('../hybridProfileService');

import {
  hybridCreateProfile,
  hybridUpdateProfile,
  hybridGetProfile,
  hybridGetAllProfiles,
  isFirebaseSyncAvailable,
} from '../hybridProfileService';
import * as firebaseConfig from '../../config/firebase.config';
import * as firebaseProfileService from '../firebaseProfileService';
import * as firebaseAuthService from '../firebaseAuthService';
import { Profile } from '../../types/types';

// Mock dependencies
jest.mock('../../config/firebase.config');
jest.mock('../firebaseProfileService');
jest.mock('../firebaseAuthService');

describe('Hybrid Profile Service', () => {
  const mockProfile: Profile = {
    name: 'John Doe',
    expertise: 'Software Development',
    interest: 'Machine Learning',
    expertiseYears: 5,
    interestYears: 2,
    email: 'john@example.com',
    phoneNumber: '555-1234',
    location: 'San Francisco, CA',
    createdAt: '2026-01-23T00:00:00.000Z',
    updatedAt: '2026-01-23T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    // Mock authenticated Firebase user by default
    (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
      uid: 'test-uid',
      email: 'john@example.com',
    });
  });

  describe('hybridCreateProfile', () => {
    it('should save profile locally when Firebase is not configured', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      await hybridCreateProfile(mockProfile);

      const savedProfile = await AsyncStorage.getItem('profile');
      expect(savedProfile).toBeTruthy();
      expect(JSON.parse(savedProfile!)).toEqual(mockProfile);

      const allProfiles = await AsyncStorage.getItem('allProfiles');
      expect(allProfiles).toBeTruthy();
      const profiles = JSON.parse(allProfiles!);
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual(mockProfile);

      expect(firebaseProfileService.createFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should save profile locally and sync to Firebase when configured', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.createFirebaseProfile as jest.Mock).mockResolvedValue(
        undefined
      );

      await hybridCreateProfile(mockProfile);

      const savedProfile = await AsyncStorage.getItem('profile');
      expect(savedProfile).toBeTruthy();
      expect(JSON.parse(savedProfile!)).toEqual(mockProfile);

      expect(firebaseProfileService.createFirebaseProfile).toHaveBeenCalledWith(
        mockProfile
      );
    });

    it('should continue if Firebase sync fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.createFirebaseProfile as jest.Mock).mockRejectedValue(
        new Error('Firebase error')
      );

      await hybridCreateProfile(mockProfile);

      const savedProfile = await AsyncStorage.getItem('profile');
      expect(savedProfile).toBeTruthy();
      expect(JSON.parse(savedProfile!)).toEqual(mockProfile);

      expect(firebaseProfileService.createFirebaseProfile).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in Firebase sync', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.createFirebaseProfile as jest.Mock).mockRejectedValue(
        'Firebase error string'
      );

      await hybridCreateProfile(mockProfile);

      const savedProfile = await AsyncStorage.getItem('profile');
      expect(savedProfile).toBeTruthy();
      expect(JSON.parse(savedProfile!)).toEqual(mockProfile);
    });

    it('should handle non-Error thrown in outer catch block', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce('Storage error string');

      await expect(hybridCreateProfile(mockProfile)).rejects.toBe('Storage error string');
    });

    it('should remove existing profile with same email before adding', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      const existingProfile = { ...mockProfile, name: 'Old Name' };
      await AsyncStorage.setItem('allProfiles', JSON.stringify([existingProfile]));

      await hybridCreateProfile(mockProfile);

      const allProfiles = await AsyncStorage.getItem('allProfiles');
      const profiles = JSON.parse(allProfiles!);
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('John Doe');
    });

    it('should skip Firebase sync when user is not authenticated', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue(null);

      await hybridCreateProfile(mockProfile);

      expect(firebaseProfileService.createFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should skip Firebase sync when user email does not match profile email', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
        uid: 'test-uid',
        email: 'different@example.com',
      });

      await hybridCreateProfile(mockProfile);

      expect(firebaseProfileService.createFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should throw error if local save fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage error'));

      await expect(hybridCreateProfile(mockProfile)).rejects.toThrow('Storage error');
    });
  });

  describe('hybridUpdateProfile', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile]));
    });

    it('should update profile locally when Firebase is not configured', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      const updates = { name: 'Jane Doe', location: 'New York, NY' };
      await hybridUpdateProfile(mockProfile.email, updates);

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('Jane Doe');
      expect(profile.location).toBe('New York, NY');
      expect(profile.updatedAt).toBeDefined();

      const allProfiles = await AsyncStorage.getItem('allProfiles');
      const profiles = JSON.parse(allProfiles!);
      expect(profiles[0].name).toBe('Jane Doe');

      expect(firebaseProfileService.updateFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should update profile locally and sync to Firebase when configured', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.updateFirebaseProfile as jest.Mock).mockResolvedValue(
        undefined
      );

      const updates = { name: 'Jane Doe' };
      await hybridUpdateProfile(mockProfile.email, updates);

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('Jane Doe');

      expect(firebaseProfileService.updateFirebaseProfile).toHaveBeenCalledWith(
        mockProfile.email,
        updates
      );
    });

    it('should continue if Firebase sync fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.updateFirebaseProfile as jest.Mock).mockRejectedValue(
        new Error('Firebase error')
      );

      const updates = { name: 'Jane Doe' };
      await hybridUpdateProfile(mockProfile.email, updates);

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('Jane Doe');

      expect(firebaseProfileService.updateFirebaseProfile).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in Firebase update sync', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.updateFirebaseProfile as jest.Mock).mockRejectedValue(
        'Firebase error string'
      );

      const updates = { name: 'Jane Doe' };
      await hybridUpdateProfile(mockProfile.email, updates);

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('Jane Doe');
    });

    it('should handle non-Error thrown in outer catch block of update', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce('Storage error string');

      await expect(
        hybridUpdateProfile(mockProfile.email, { name: 'Test' })
      ).rejects.toBe('Storage error string');
    });

    it('should throw error if profile not found', async () => {
      await AsyncStorage.clear();

      await expect(
        hybridUpdateProfile('notfound@example.com', { name: 'Test' })
      ).rejects.toThrow('Profile not found');
    });

    it('should skip Firebase sync when user is not authenticated', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue(null);

      const updates = { name: 'Jane Doe' };
      await hybridUpdateProfile(mockProfile.email, updates);

      expect(firebaseProfileService.updateFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should skip Firebase sync when user email does not match profile email', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
        uid: 'test-uid',
        email: 'different@example.com',
      });

      const updates = { name: 'Jane Doe' };
      await hybridUpdateProfile(mockProfile.email, updates);

      expect(firebaseProfileService.updateFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should update profile even if not in allProfiles', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
      await AsyncStorage.removeItem('allProfiles');

      const updates = { name: 'Jane Doe' };
      await hybridUpdateProfile(mockProfile.email, updates);

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('Jane Doe');
    });
  });

  describe('hybridGetProfile', () => {
    it('should get profile from Firebase when configured and available', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getFirebaseProfile as jest.Mock).mockResolvedValue(
        mockProfile
      );

      const result = await hybridGetProfile(mockProfile.email);

      expect(result).toEqual(mockProfile);
      expect(firebaseProfileService.getFirebaseProfile).toHaveBeenCalledWith(
        mockProfile.email
      );
    });

    it('should fallback to local storage if Firebase fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getFirebaseProfile as jest.Mock).mockRejectedValue(
        new Error('Firebase error')
      );

      await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

      const result = await hybridGetProfile(mockProfile.email);

      expect(result).toEqual(mockProfile);
    });

    it('should handle non-Error thrown in Firebase getProfile', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getFirebaseProfile as jest.Mock).mockRejectedValue(
        'Firebase error string'
      );

      await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

      const result = await hybridGetProfile(mockProfile.email);

      expect(result).toEqual(mockProfile);
    });

    it('should handle non-Error thrown in outer catch block of getProfile', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce('Storage error string');

      await expect(hybridGetProfile(mockProfile.email)).rejects.toBe('Storage error string');
    });

    it('should get profile from local storage when Firebase not configured', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

      const result = await hybridGetProfile(mockProfile.email);

      expect(result).toEqual(mockProfile);
      expect(firebaseProfileService.getFirebaseProfile).not.toHaveBeenCalled();
    });

    it('should check allProfiles if not in profile key', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile]));

      const result = await hybridGetProfile(mockProfile.email);

      expect(result).toEqual(mockProfile);
    });

    it('should return null if profile not found anywhere', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      const result = await hybridGetProfile('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should return null if profile email does not match requested email', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      const differentProfile = { ...mockProfile, email: 'different@example.com' };
      await AsyncStorage.setItem('profile', JSON.stringify(differentProfile));

      const result = await hybridGetProfile(mockProfile.email);

      expect(result).toBeNull();
    });

    it('should throw error if local storage read fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      await expect(hybridGetProfile(mockProfile.email)).rejects.toThrow('Storage error');
    });
  });

  describe('hybridGetAllProfiles', () => {
    const mockProfile2: Profile = {
      ...mockProfile,
      email: 'jane@example.com',
      name: 'Jane Smith',
    };

    it('should merge profiles from Firebase and local storage', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getAllFirebaseProfiles as jest.Mock).mockResolvedValue([
        mockProfile,
      ]);

      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile2]));

      const result = await hybridGetAllProfiles();

      expect(result).toHaveLength(2);
      expect(result.find((p) => p.email === mockProfile.email)).toBeTruthy();
      expect(result.find((p) => p.email === mockProfile2.email)).toBeTruthy();
    });

    it('should not include duplicate profiles', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getAllFirebaseProfiles as jest.Mock).mockResolvedValue([
        mockProfile,
      ]);

      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile]));

      const result = await hybridGetAllProfiles();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(mockProfile.email);
    });

    it('should return local profiles only when Firebase not configured', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      await AsyncStorage.setItem(
        'allProfiles',
        JSON.stringify([mockProfile, mockProfile2])
      );

      const result = await hybridGetAllProfiles();

      expect(result).toHaveLength(2);
      expect(firebaseProfileService.getAllFirebaseProfiles).not.toHaveBeenCalled();
    });

    it('should continue if Firebase fails and return local profiles', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getAllFirebaseProfiles as jest.Mock).mockRejectedValue(
        new Error('Firebase error')
      );

      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile]));

      const result = await hybridGetAllProfiles();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProfile);
    });

    it('should handle non-Error thrown in Firebase getAllProfiles', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseProfileService.getAllFirebaseProfiles as jest.Mock).mockRejectedValue(
        'Firebase error string'
      );

      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile]));

      const result = await hybridGetAllProfiles();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProfile);
    });

    it('should handle non-Error thrown in outer catch block of getAllProfiles', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce('Storage error string');

      await expect(hybridGetAllProfiles()).rejects.toBe('Storage error string');
    });

    it('should return empty array if no profiles exist', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      const result = await hybridGetAllProfiles();

      expect(result).toEqual([]);
    });
  });

  describe('isFirebaseSyncAvailable', () => {
    it('should return true when Firebase is configured', () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);

      expect(isFirebaseSyncAvailable()).toBe(true);
    });

    it('should return false when Firebase is not configured', () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      expect(isFirebaseSyncAvailable()).toBe(false);
    });
  });
});
