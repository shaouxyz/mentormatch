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

describe('testAccounts', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  describe('TEST_ACCOUNTS', () => {
    it('should have two test accounts', () => {
      expect(TEST_ACCOUNTS).toHaveLength(2);
    });

    it('should have t0 account with correct structure', () => {
      const t0 = TEST_ACCOUNTS.find((acc) => acc.email === 't0');
      expect(t0).toBeDefined();
      expect(t0?.email).toBe('t0');
      expect(t0?.password).toBe('123');
      expect(t0?.name).toBe('Test User 0');
      expect(t0?.profile).toBeDefined();
      expect(t0?.profile?.expertise).toBe('Software Development');
      expect(t0?.profile?.interest).toBe('Data Science');
      expect(t0?.profile?.expertiseYears).toBe(5);
      expect(t0?.profile?.interestYears).toBe(1);
    });

    it('should have t1 account with correct structure', () => {
      const t1 = TEST_ACCOUNTS.find((acc) => acc.email === 't1');
      expect(t1).toBeDefined();
      expect(t1?.email).toBe('t1');
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

      const testAccountsData = await AsyncStorage.getItem('testAccounts');
      expect(testAccountsData).toBeTruthy();

      const accounts = JSON.parse(testAccountsData || '[]');
      expect(accounts).toHaveLength(2);
      expect(accounts[0].email).toBe('t0');
      expect(accounts[1].email).toBe('t1');
    });

    it('should store test profiles correctly', async () => {
      await initializeTestAccounts();

      const t0Profile = await AsyncStorage.getItem('testProfile_t0');
      expect(t0Profile).toBeTruthy();
      const parsedT0 = JSON.parse(t0Profile || '{}');
      expect(parsedT0.name).toBe('Test User 0');
      expect(parsedT0.expertise).toBe('Software Development');

      const t1Profile = await AsyncStorage.getItem('testProfile_t1');
      expect(t1Profile).toBeTruthy();
      const parsedT1 = JSON.parse(t1Profile || '{}');
      expect(parsedT1.name).toBe('Test User 1');
      expect(parsedT1.expertise).toBe('Data Science');
    });

    it('should not re-initialize if already initialized', async () => {
      await AsyncStorage.setItem('testAccountsInitialized', 'true');
      await AsyncStorage.setItem('testAccounts', JSON.stringify([{ email: 'existing' }]));

      await initializeTestAccounts();

      const accounts = await AsyncStorage.getItem('testAccounts');
      const parsed = JSON.parse(accounts || '[]');
      // Should not have overwritten
      expect(parsed[0].email).toBe('existing');
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

    it('should create test account data with correct structure', async () => {
      await initializeTestAccounts();

      const testAccountsData = await AsyncStorage.getItem('testAccounts');
      const accounts = JSON.parse(testAccountsData || '[]');

      accounts.forEach((account: any) => {
        expect(account).toHaveProperty('email');
        expect(account).toHaveProperty('password');
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('createdAt');
        expect(account).toHaveProperty('isTestAccount', true);
        expect(account.id).toMatch(/^test-/);
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
      expect(account?.email).toBe('t0');
      expect(account?.password).toBe('123');
      expect(account?.profile).toBeDefined();
    });

    it('should return test account for t1', async () => {
      const account = await getTestAccount('t1');
      expect(account).toBeDefined();
      expect(account?.email).toBe('t1');
      expect(account?.password).toBe('123');
    });

    it('should return null for non-existent account', async () => {
      const account = await getTestAccount('nonexistent');
      expect(account).toBeNull();
    });

    it('should return null if testAccounts not initialized', async () => {
      await AsyncStorage.removeItem('testAccounts');
      const account = await getTestAccount('t0');
      expect(account).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      const account = await getTestAccount('t0');
      expect(account).toBeNull();

      AsyncStorage.getItem = originalGetItem;
    });

    it('should return null if account not in testAccounts but exists in TEST_ACCOUNTS', async () => {
      // Set testAccounts with different account to test lookup
      await AsyncStorage.setItem('testAccounts', JSON.stringify([{ email: 'other@test.com' }]));
      
      // Even though t0 exists in TEST_ACCOUNTS, it's not in AsyncStorage testAccounts
      const account = await getTestAccount('t0');
      expect(account).toBeNull();
    });

    it('should return full account data when found in both AsyncStorage and TEST_ACCOUNTS', async () => {
      // Ensure testAccounts has t0
      await initializeTestAccounts();
      
      const account = await getTestAccount('t0');
      expect(account).toBeDefined();
      expect(account?.email).toBe('t0');
      expect(account?.password).toBe('123');
      expect(account?.name).toBe('Test User 0');
      expect(account?.profile).toBeDefined();
      expect(account?.profile?.expertise).toBe('Software Development');
    });
  });
});
