/**
 * CASPA Profiles Tests
 * 
 * Tests for utils/caspaProfiles.ts - CASPA member profile initialization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeCaspaProfiles, resetCaspaProfiles, CASPA_PROFILES } from '../caspaProfiles';
import { STORAGE_KEYS } from '../constants';
import * as logger from '../logger';

// Mock dependencies
jest.mock('../logger');

const mockLogger = logger as any;

describe('CASPA Profiles', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('CASPA_PROFILES constant', () => {
    it('should export CASPA_PROFILES array', () => {
      expect(Array.isArray(CASPA_PROFILES)).toBe(true);
      expect(CASPA_PROFILES.length).toBeGreaterThan(0);
    });

    it('should have profiles with required fields', () => {
      CASPA_PROFILES.forEach((profile) => {
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('email');
        expect(profile).toHaveProperty('expertise');
        expect(profile).toHaveProperty('interest');
        expect(profile).toHaveProperty('expertiseYears');
        expect(profile).toHaveProperty('interestYears');
        expect(profile).toHaveProperty('phoneNumber');
      });
    });

    it('should have all emails ending with @caspa.example.com', () => {
      CASPA_PROFILES.forEach((profile) => {
        expect(profile.email).toMatch(/@caspa\.example\.com$/);
      });
    });
  });

  describe('initializeCaspaProfiles', () => {
    it('should initialize CASPA profiles when not already initialized', async () => {
      await initializeCaspaProfiles();
      
      // Should set initialized flag
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED);
      expect(initialized).toBe('true');
      
      // Should add profiles to allProfiles
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      expect(allProfilesData).toBeTruthy();
      const allProfiles = JSON.parse(allProfilesData || '[]');
      expect(allProfiles.length).toBe(CASPA_PROFILES.length);
      
      // Should log success
      expect(mockLogger.logger.info).toHaveBeenCalledWith(
        'CASPA profiles initialized',
        expect.objectContaining({ count: CASPA_PROFILES.length })
      );
    });

    it('should not initialize if already initialized', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED, 'true');
      
      await initializeCaspaProfiles();
      
      // Should log that profiles are already initialized
      expect(mockLogger.logger.info).toHaveBeenCalledWith('CASPA profiles already initialized');
      
      // Should not add profiles again
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      if (allProfilesData) {
        const allProfiles = JSON.parse(allProfilesData);
        // Should not have duplicates
        expect(allProfiles.filter((p: any) => p.email.includes('@caspa.example.com')).length).toBeLessThanOrEqual(CASPA_PROFILES.length);
      }
    });

    it('should merge with existing profiles', async () => {
      const existingProfile = {
        name: 'Existing User',
        email: 'existing@example.com',
        expertise: 'Test',
        interest: 'Test',
        expertiseYears: 5,
        interestYears: 2,
        phoneNumber: '+1234567890',
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify([existingProfile]));
      
      await initializeCaspaProfiles();
      
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      expect(allProfilesData).toBeTruthy();
      const allProfiles = JSON.parse(allProfilesData || '[]');
      
      // Should have existing profile plus CASPA profiles
      expect(allProfiles.length).toBe(1 + CASPA_PROFILES.length);
      expect(allProfiles.find((p: any) => p.email === 'existing@example.com')).toBeTruthy();
    });

    it('should remove existing CASPA profiles before adding new ones', async () => {
      // Add some CASPA profiles first
      const oldCaspaProfile = {
        name: 'Old CASPA',
        email: 'old@caspa.example.com',
        expertise: 'Test',
        interest: 'Test',
        expertiseYears: 5,
        interestYears: 2,
        phoneNumber: '+1234567890',
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify([oldCaspaProfile]));
      
      await initializeCaspaProfiles();
      
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      const allProfiles = JSON.parse(allProfilesData || '[]');
      
      // Should not have the old CASPA profile
      expect(allProfiles.find((p: any) => p.email === 'old@caspa.example.com')).toBeFalsy();
      
      // Should have the new CASPA profiles
      expect(allProfiles.filter((p: any) => p.email.includes('@caspa.example.com')).length).toBe(CASPA_PROFILES.length);
    });

    it('should handle invalid existing profiles data gracefully', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, 'invalid json');
      
      await initializeCaspaProfiles();
      
      // Should log warning and continue
      expect(mockLogger.logger.warn).toHaveBeenCalledWith(
        'Failed to parse existing profiles, starting fresh',
        expect.any(Object)
      );
      
      // Should still initialize CASPA profiles
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED);
      expect(initialized).toBe('true');
    });

    it('should handle errors gracefully', async () => {
      // Mock AsyncStorage.setItem to throw an error
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await initializeCaspaProfiles();
      
      // Should log error
      expect(mockLogger.logger.error).toHaveBeenCalled();
      
      // Restore
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe('resetCaspaProfiles', () => {
    it('should remove initialized flag', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED, 'true');
      
      await resetCaspaProfiles();
      
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED);
      expect(initialized).toBeNull();
    });

    it('should remove CASPA profiles from allProfiles', async () => {
      // Initialize profiles first
      await initializeCaspaProfiles();
      
      // Add a non-CASPA profile
      const nonCaspaProfile = {
        name: 'Regular User',
        email: 'regular@example.com',
        expertise: 'Test',
        interest: 'Test',
        expertiseYears: 5,
        interestYears: 2,
        phoneNumber: '+1234567890',
      };
      
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      const allProfiles = JSON.parse(allProfilesData || '[]');
      allProfiles.push(nonCaspaProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(allProfiles));
      
      await resetCaspaProfiles();
      
      // Should remove CASPA profiles but keep non-CASPA profiles
      const updatedProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      const updatedProfiles = JSON.parse(updatedProfilesData || '[]');
      
      expect(updatedProfiles.find((p: any) => p.email === 'regular@example.com')).toBeTruthy();
      expect(updatedProfiles.filter((p: any) => p.email.includes('@caspa.example.com')).length).toBe(0);
    });

    it('should handle case when allProfiles does not exist', async () => {
      await resetCaspaProfiles();
      
      // Should not throw error
      expect(mockLogger.logger.error).not.toHaveBeenCalled();
    });

    it('should handle invalid allProfiles data gracefully', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, 'invalid json');
      
      await resetCaspaProfiles();
      
      // Should log error
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should log success after reset', async () => {
      await resetCaspaProfiles();
      
      expect(mockLogger.logger.info).toHaveBeenCalledWith('CASPA profiles reset');
    });
  });
});
