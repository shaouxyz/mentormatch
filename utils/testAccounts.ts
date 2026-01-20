import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const initialized = await AsyncStorage.getItem('testAccountsInitialized');
    if (initialized === 'true') {
      return; // Already initialized
    }

    // Store test accounts
    const testAccountsData = TEST_ACCOUNTS.map((account) => ({
      email: account.email,
      password: account.password,
      id: `test-${account.email}`,
      createdAt: new Date().toISOString(),
      isTestAccount: true,
    }));

    await AsyncStorage.setItem('testAccounts', JSON.stringify(testAccountsData));

    // Store test profiles
    for (const account of TEST_ACCOUNTS) {
      if (account.profile) {
        const profileKey = `testProfile_${account.email}`;
        await AsyncStorage.setItem(profileKey, JSON.stringify(account.profile));
      }
    }

    await AsyncStorage.setItem('testAccountsInitialized', 'true');
  } catch (error) {
    console.error('Error initializing test accounts:', error);
  }
}

export async function getTestAccount(email: string): Promise<TestUser | null> {
  try {
    const testAccountsData = await AsyncStorage.getItem('testAccounts');
    if (!testAccountsData) return null;

    const accounts = JSON.parse(testAccountsData);
    const account = accounts.find((a: any) => a.email === email);
    
    if (!account) return null;

    const testAccount = TEST_ACCOUNTS.find((ta) => ta.email === email);
    return testAccount || null;
  } catch (error) {
    console.error('Error getting test account:', error);
    return null;
  }
}
