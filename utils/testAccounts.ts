import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { STORAGE_KEYS } from './constants';
import { safeParseJSON, validateProfileSchema } from './schemaValidation';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  profile?: {
    name: string;
    expertise: string;
    interest: string;
    expertiseYears: number;
    interestYears: number;
    email: string;
    phoneNumber: string;
  };
}

export const TEST_ACCOUNTS: TestUser[] = [
  {
    email: 't0',
    password: '123',
    name: 'Test User 0',
    profile: {
      name: 'Test User 0',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 1,
      email: 't0',
      phoneNumber: '+1234567890',
    },
  },
  {
    email: 't1',
    password: '123',
    name: 'Test User 1',
    profile: {
      name: 'Test User 1',
      expertise: 'Data Science',
      interest: 'Software Development',
      expertiseYears: 7,
      interestYears: 2,
      email: 't1',
      phoneNumber: '+1234567891',
    },
  },
];

export async function initializeTestAccounts() {
  try {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.TEST_ACCOUNTS_INITIALIZED);
    if (initialized === 'true') {
      return; // Already initialized
    }

    // Note: We do NOT store passwords in AsyncStorage for security
    // Test accounts are identified by email and passwords are checked against
    // the in-memory TEST_ACCOUNTS array only. When test accounts are used,
    // they are created as regular users with hashed passwords.

    // Store test profiles only (no passwords)
    const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
    let allProfiles = allProfilesData
      ? safeParseJSON(
          allProfilesData,
          (data): data is TestUser['profile'][] => {
            if (!Array.isArray(data)) return false;
            return data.every((profile) => profile && validateProfileSchema(profile));
          },
          []
        ) || []
      : [];

    for (const account of TEST_ACCOUNTS) {
      if (account.profile) {
        const profileKey = `testProfile_${account.email}`;
        await AsyncStorage.setItem(profileKey, JSON.stringify(account.profile));

        // Ensure test profiles appear in discover/allProfiles
        if (!allProfiles.find((profile) => profile?.email === account.email)) {
          allProfiles.push(account.profile);
        }
      }
    }

    if (allProfiles.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(allProfiles));
    }

    await AsyncStorage.setItem(STORAGE_KEYS.TEST_ACCOUNTS_INITIALIZED, 'true');
  } catch (error) {
    logger.error('Error initializing test accounts', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get test account by email
 * Note: Test accounts are stored in-memory only (TEST_ACCOUNTS array)
 * Passwords are never stored in AsyncStorage for security
 */
export async function getTestAccount(email: string): Promise<TestUser | null> {
  try {
    // Test accounts are identified from in-memory array only
    // No passwords are stored in AsyncStorage
    const testAccount = TEST_ACCOUNTS.find((ta) => ta.email === email);
    return testAccount || null;
  } catch (error) {
    logger.error('Error getting test account', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
