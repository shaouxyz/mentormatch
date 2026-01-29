/**
 * Profile Service Tests
 * 
 * Tests for services/profileService.ts - profile service layer
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentProfile,
  saveProfile,
  getAllProfiles,
  getProfileByEmail,
  deleteProfile,
} from '../profileService';
import { STORAGE_KEYS } from '../../utils/constants';
import { Profile } from '../../types/types';
import * as logger from '../../utils/logger';
import * as schemaValidation from '../../utils/schemaValidation';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../utils/schemaValidation');

const mockLogger = logger as any;
const mockSchemaValidation = schemaValidation as any;

describe('Profile Service', () => {
  const mockProfile: Profile = {
    name: 'Test User',
    email: 'test@example.com',
    expertise: 'Software Engineering',
    interest: 'Machine Learning',
    expertiseYears: 5,
    interestYears: 2,
    phoneNumber: '+1234567890',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockSchemaValidation.validateProfileSchema.mockReturnValue(true);
    mockSchemaValidation.safeParseJSON.mockImplementation((data, validator, defaultValue) => {
      if (!data) return defaultValue;
      try {
        const parsed = JSON.parse(data);
        return validator(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    });
  });

  describe('getCurrentProfile', () => {
    it('should return null when no profile exists', async () => {
      const profile = await getCurrentProfile();
      expect(profile).toBeNull();
    });

    it('should return profile when profile exists', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(mockProfile));
      mockSchemaValidation.safeParseJSON.mockReturnValue(mockProfile);
      
      const profile = await getCurrentProfile();
      expect(profile).toEqual(mockProfile);
    });

    it('should return null when profile data is invalid', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, 'invalid json');
      mockSchemaValidation.safeParseJSON.mockReturnValue(null);
      
      const profile = await getCurrentProfile();
      expect(profile).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const profile = await getCurrentProfile();
      expect(profile).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getCurrentProfile', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const profile = await getCurrentProfile();
      expect(profile).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('saveProfile', () => {
    it('should save profile successfully', async () => {
      await saveProfile(mockProfile);
      
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      expect(savedData).toBeTruthy();
      const savedProfile = JSON.parse(savedData || '{}');
      expect(savedProfile.email).toBe(mockProfile.email);
      
      // Should also update allProfiles
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      expect(allProfilesData).toBeTruthy();
      const allProfiles = JSON.parse(allProfilesData || '[]');
      expect(allProfiles).toHaveLength(1);
      expect(allProfiles[0].email).toBe(mockProfile.email);
    });

    it('should throw error when profile is invalid', async () => {
      mockSchemaValidation.validateProfileSchema.mockReturnValue(false);
      
      await expect(saveProfile(mockProfile)).rejects.toThrow('Invalid profile data');
    });

    it('should update existing profile in allProfiles', async () => {
      const existingProfile: Profile = {
        ...mockProfile,
        name: 'Old Name',
      };
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify([existingProfile]));
      
      await saveProfile(mockProfile);
      
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      const allProfiles = JSON.parse(allProfilesData || '[]');
      expect(allProfiles).toHaveLength(1);
      expect(allProfiles[0].name).toBe('Test User');
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(saveProfile(mockProfile)).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in saveProfile', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');
      
      await expect(saveProfile(mockProfile)).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('getAllProfiles', () => {
    it('should return empty array when no profiles exist', async () => {
      const profiles = await getAllProfiles();
      expect(profiles).toEqual([]);
    });

    it('should return all profiles when profiles exist', async () => {
      const profiles = [mockProfile, { ...mockProfile, email: 'other@example.com' }];
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(profiles));
      mockSchemaValidation.safeParseJSON.mockReturnValue(profiles);
      
      const result = await getAllProfiles();
      expect(result).toHaveLength(2);
    });

    it('should exclude specified email', async () => {
      const profiles = [
        mockProfile,
        { ...mockProfile, email: 'other@example.com' },
      ];
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(profiles));
      mockSchemaValidation.safeParseJSON.mockReturnValue(profiles);
      
      const result = await getAllProfiles('test@example.com');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('other@example.com');
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const profiles = await getAllProfiles();
      expect(profiles).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getAllProfiles', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const profiles = await getAllProfiles();
      expect(profiles).toEqual([]);
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('getProfileByEmail', () => {
    it('should return null when profile not found', async () => {
      const profile = await getProfileByEmail('nonexistent@example.com');
      expect(profile).toBeNull();
    });

    it('should return profile when found', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify([mockProfile]));
      mockSchemaValidation.safeParseJSON.mockReturnValue([mockProfile]);
      
      const profile = await getProfileByEmail('test@example.com');
      expect(profile).toEqual(mockProfile);
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const profile = await getProfileByEmail('test@example.com');
      expect(profile).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle non-Error thrown in getProfileByEmail', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue('Storage error string');
      
      const profile = await getProfileByEmail('test@example.com');
      expect(profile).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile from allProfiles', async () => {
      const profiles = [mockProfile, { ...mockProfile, email: 'other@example.com' }];
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(profiles));
      mockSchemaValidation.safeParseJSON.mockReturnValue(profiles);
      
      await deleteProfile('test@example.com');
      
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      const allProfiles = JSON.parse(allProfilesData || '[]');
      expect(allProfiles).toHaveLength(1);
      expect(allProfiles[0].email).toBe('other@example.com');
    });

    it('should remove from profile storage if it is current profile', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(mockProfile));
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify([mockProfile]));
      
      // Mock safeParseJSON to return different values for different calls
      // First call in deleteProfile: getAllProfiles (returns array)
      // Second call in deleteProfile: getCurrentProfile (returns profile)
      mockSchemaValidation.safeParseJSON
        .mockReturnValueOnce([mockProfile]) // getAllProfiles call
        .mockReturnValueOnce(mockProfile); // getCurrentProfile call
      
      await deleteProfile('test@example.com');
      
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      expect(profileData).toBeNull();
    });

    it('should not remove from profile storage if it is not current profile', async () => {
      const otherProfile: Profile = { ...mockProfile, email: 'other@example.com' };
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(otherProfile));
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify([mockProfile]));
      
      // Mock safeParseJSON: first call for getAllProfiles, second for getCurrentProfile
      mockSchemaValidation.safeParseJSON
        .mockReturnValueOnce([mockProfile]) // getAllProfiles call
        .mockReturnValueOnce(otherProfile); // getCurrentProfile call
      
      await deleteProfile('test@example.com');
      
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      expect(profileData).toBeTruthy();
    });

    it('should handle errors and throw', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(deleteProfile('test@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle non-Error thrown in deleteProfile', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue('Storage error string');
      
      await expect(deleteProfile('test@example.com')).rejects.toBe('Storage error string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      AsyncStorage.setItem = originalSetItem;
    });
  });
});
