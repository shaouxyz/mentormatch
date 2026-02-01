import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TEST_ACCOUNTS,
  initializeTestAccounts,
  getTestAccount,
} from '../testAccounts';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('testAccounts', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('TEST_ACCOUNTS', () => {
    it('should have two test accounts', () => {
      expect(TEST_ACCOUNTS).toHaveLength(2);
    });

    it('should have t0 account with correct structure', () => {
      const t0 = TEST_ACCOUNTS.find((acc) => acc.email === 't0@example.com');
      expect(t0).toBeDefined();
      expect(t0?.email).toBe('t0@example.com');
      expect(t0?.password).toBe('123');
      expect(t0?.name).toBe('Test User 0');
      expect(t0?.profile).toBeDefined();
      expect(t0?.profile?.expertise).toBe('Software Development');
      expect(t0?.profile?.interest).toBe('Data Science');
      expect(t0?.profile?.expertiseYears).toBe(5);
      expect(t0?.profile?.interestYears).toBe(1);
    });

    it('should have t1 account with correct structure', () => {
      const t1 = TEST_ACCOUNTS.find((acc) => acc.email === 't1@example.com');
      expect(t1).toBeDefined();
      expect(t1?.email).toBe('t1@example.com');
      expect(t1?.password).toBe('123');
      expect(t1?.name).toBe('Test User 1');
      expect(t1?.profile).toBeDefined();
      expect(t1?.profile?.expertise).toBe('Data Science');
      expect(t1?.profile?.interest).toBe('Software Development');
      expect(t1?.profile?.expertiseYears).toBe(7);
      expect(t1?.profile?.interestYears).toBe(2);
    });
  });

  describe('initializeTestAccounts', () => {
    it('should initialize test accounts on first call', async () => {
      await initializeTestAccounts();

      const initialized = await AsyncStorage.getItem('testAccountsInitialized');
      expect(initialized).toBe('true');

      // Test profiles should be stored in allProfiles
      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      expect(allProfilesData).toBeTruthy();

      const profiles = JSON.parse(allProfilesData || '[]');
      // Should have at least the 2 test profiles
      expect(profiles.length).toBeGreaterThanOrEqual(2);
      
      const t0Profile = profiles.find((p: any) => p.email === 't0@example.com');
      const t1Profile = profiles.find((p: any) => p.email === 't1@example.com');
      expect(t0Profile).toBeDefined();
      expect(t1Profile).toBeDefined();
    });

    it('should store test profiles correctly', async () => {
      await initializeTestAccounts();

      const t0Profile = await AsyncStorage.getItem('testProfile_t0@example.com');
      expect(t0Profile).toBeTruthy();
      const parsedT0 = JSON.parse(t0Profile || '{}');
      expect(parsedT0.name).toBe('Test User 0');
      expect(parsedT0.expertise).toBe('Software Development');

      const t1Profile = await AsyncStorage.getItem('testProfile_t1@example.com');
      expect(t1Profile).toBeTruthy();
      const parsedT1 = JSON.parse(t1Profile || '{}');
      expect(parsedT1.name).toBe('Test User 1');
      expect(parsedT1.expertise).toBe('Data Science');
    });

    it('should not re-initialize if already initialized', async () => {
      await AsyncStorage.setItem('testAccountsInitialized', 'true');
      const existingProfiles = [{ 
        email: 'existing@example.com', 
        name: 'Existing User',
        expertise: 'Test',
        interest: 'Test',
        expertiseYears: 1,
        interestYears: 1,
        phoneNumber: '+1234567890'
      }];
      await AsyncStorage.setItem('allProfiles', JSON.stringify(existingProfiles));

      await initializeTestAccounts();

      const profiles = await AsyncStorage.getItem('allProfiles');
      const parsed = JSON.parse(profiles || '[]');
      // Should still have the existing profile
      const existingProfile = parsed.find((p: any) => p.email === 'existing@example.com');
      expect(existingProfile).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock AsyncStorage to throw error
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      await expect(initializeTestAccounts()).resolves.not.toThrow();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should create test profile data with correct structure', async () => {
      await initializeTestAccounts();

      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      const profiles = JSON.parse(allProfilesData || '[]');

      const testProfiles = profiles.filter((p: any) => 
        p.email === 't0@example.com' || p.email === 't1@example.com'
      );

      expect(testProfiles.length).toBeGreaterThanOrEqual(2);

      testProfiles.forEach((profile: any) => {
        expect(profile).toHaveProperty('email');
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('expertise');
        expect(profile).toHaveProperty('interest');
        expect(profile).toHaveProperty('expertiseYears');
        expect(profile).toHaveProperty('interestYears');
        expect(profile).toHaveProperty('phoneNumber');
      });
    });
  });

  describe('getTestAccount', () => {
    beforeEach(async () => {
      await initializeTestAccounts();
    });

    it('should return test account for t0', async () => {
      const account = await getTestAccount('t0');
      expect(account).toBeDefined();
      expect(account?.email).toBe('t0@example.com');
      expect(account?.password).toBe('123');
      expect(account?.profile).toBeDefined();
    });

    it('should return test account for t1', async () => {
      const account = await getTestAccount('t1');
      expect(account).toBeDefined();
      expect(account?.email).toBe('t1@example.com');
      expect(account?.password).toBe('123');
    });

    it('should return null for non-existent account', async () => {
      const account = await getTestAccount('nonexistent');
      expect(account).toBeNull();
    });

    it('should return test account even without AsyncStorage (in-memory)', async () => {
      // Test accounts are now in-memory, so they should always be available
      await AsyncStorage.clear();
      const account = await getTestAccount('t0');
      expect(account).toBeDefined();
      expect(account?.email).toBe('t0@example.com');
    });

    it('should handle getLegacyAlias when email does not include @ (line 61 branch 0)', async () => {
      // Test branch 0 of line 61: when !email.includes('@') is true
      // This is tested indirectly through getTestAccount
      await initializeTestAccounts();
      
      // Test with alias that doesn't include @
      const account = await getTestAccount('t0'); // 't0' doesn't include '@'
      expect(account).toBeDefined();
      expect(account?.email).toBe('t0@example.com');
    });

    it('should handle errors gracefully in getTestAccount (line 161-162)', async () => {
      // Test error handling in getTestAccount (lines 161-162)
      // Mock TEST_ACCOUNTS.find to throw an error
      const originalFind = Array.prototype.find;
      const TEST_ACCOUNTS = require('../testAccounts').TEST_ACCOUNTS;
      const originalFindMethod = TEST_ACCOUNTS.find;
      
      // Create a spy that throws an error
      TEST_ACCOUNTS.find = jest.fn(() => {
        throw new Error('Find error');
      });

      const result = await getTestAccount('t0@example.com');

      // Should return null and log error (line 161-162)
      expect(result).toBeNull();
      const logger = require('../logger').logger;
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting test account',
        expect.any(Error)
      );

      // Restore
      TEST_ACCOUNTS.find = originalFindMethod;
      Array.prototype.find = originalFind;
    });

    it('should handle non-Error exception in getTestAccount (line 161-162)', async () => {
      // Test non-Error exception handling in getTestAccount (lines 161-162)
      const TEST_ACCOUNTS = require('../testAccounts').TEST_ACCOUNTS;
      const originalFindMethod = TEST_ACCOUNTS.find;
      
      // Create a spy that throws a non-Error
      TEST_ACCOUNTS.find = jest.fn(() => {
        throw 'Find error string';
      });

      const result = await getTestAccount('t0@example.com');

      // Should return null and log error (line 161-162)
      expect(result).toBeNull();
      const logger = require('../logger').logger;
      expect(logger.error).toHaveBeenCalled();

      // Restore
      TEST_ACCOUNTS.find = originalFindMethod;
    });


    it('should support both short form (t0) and full email (t0@example.com)', async () => {
      // Test with short form
      const accountShort = await getTestAccount('t0');
      expect(accountShort).toBeDefined();
      expect(accountShort?.email).toBe('t0@example.com');
      
      // Test with full email
      const accountFull = await getTestAccount('t0@example.com');
      expect(accountFull).toBeDefined();
      expect(accountFull?.email).toBe('t0@example.com');
    });

    it('should return full account data with profile', async () => {
      await initializeTestAccounts();
      
      const account = await getTestAccount('t0');
      expect(account).toBeDefined();
      expect(account?.email).toBe('t0@example.com');
      expect(account?.password).toBe('123');
      expect(account?.name).toBe('Test User 0');
      expect(account?.profile).toBeDefined();
      expect(account?.profile?.expertise).toBe('Software Development');
    });
  });
});
