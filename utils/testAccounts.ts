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
    email: 't0@example.com',
    password: '123',
    name: 'Test User 0',
    profile: {
      name: 'Test User 0',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 1,
      email: 't0@example.com',
      phoneNumber: '+1234567890',
    },
  },
  {
    email: 't1@example.com',
    password: '123',
    name: 'Test User 1',
    profile: {
      name: 'Test User 1',
      expertise: 'Data Science',
      interest: 'Software Development',
      expertiseYears: 7,
      interestYears: 2,
      email: 't1@example.com',
      phoneNumber: '+1234567891',
    },
  },
];

function normalizeTestAccountEmail(email: string): string {
  if (email.includes('@')) {
    return email.toLowerCase();
  }
  return `${email.toLowerCase()}@example.com`;
}

function getLegacyAlias(email: string): string | null {
  if (!email.includes('@')) {
    return email.toLowerCase();
  }
  const alias = email.split('@')[0];
  return alias ? alias.toLowerCase() : null;
}

export async function initializeTestAccounts() {
  try {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.TEST_ACCOUNTS_INITIALIZED);

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
        const normalizedEmail = normalizeTestAccountEmail(account.email);
        const legacyAlias = getLegacyAlias(account.email);
        const profile = { ...account.profile, email: normalizedEmail };

        const profileKeys = [`testProfile_${normalizedEmail}`];
        if (legacyAlias && legacyAlias !== normalizedEmail) {
          profileKeys.push(`testProfile_${legacyAlias}`);
        }

        let hasValidProfile = false;
        for (const key of profileKeys) {
          const existing = await AsyncStorage.getItem(key);
          if (existing) {
            const parsed = safeParseJSON(
              existing,
              validateProfileSchema,
              null
            );
            if (parsed) {
              hasValidProfile = true;
              break;
            }
          }
        }

        if (!hasValidProfile) {
          for (const key of profileKeys) {
            await AsyncStorage.setItem(key, JSON.stringify(profile));
          }
        }

        // Ensure test profiles appear in discover/allProfiles
        allProfiles = allProfiles.filter(
          (existingProfile) =>
            existingProfile?.email !== normalizedEmail &&
            (!legacyAlias || existingProfile?.email !== legacyAlias)
        );
        allProfiles.push(profile);
      }
    }

    if (allProfiles.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(allProfiles));
    }

    if (initialized !== 'true') {
      await AsyncStorage.setItem(STORAGE_KEYS.TEST_ACCOUNTS_INITIALIZED, 'true');
    }
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
    const normalized = normalizeTestAccountEmail(email);
    const testAccount = TEST_ACCOUNTS.find(
      (ta) =>
        ta.email.toLowerCase() === email.toLowerCase() ||
        ta.email.toLowerCase() === normalized
    );
    return testAccount || null;
  } catch (error) {
    logger.error('Error getting test account', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
