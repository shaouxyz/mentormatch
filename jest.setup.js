// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Firebase config
jest.mock('./config/firebase.config', () => ({
  initializeFirebase: jest.fn(),
  getFirebaseAuth: jest.fn(() => ({})),
  getFirebaseFirestore: jest.fn(() => ({})),
  isFirebaseConfigured: jest.fn(() => false), // Default to not configured for tests
  firebaseConfig: {},
}));

// Mock Firebase auth service
jest.mock('./services/firebaseAuthService', () => ({
  firebaseSignUp: jest.fn(),
  firebaseSignIn: jest.fn(),
  firebaseSignOut: jest.fn(),
  getCurrentFirebaseUser: jest.fn(() => null),
}));

// Mock Firebase profile service
jest.mock('./services/firebaseProfileService', () => ({
  createFirebaseProfile: jest.fn(),
  updateFirebaseProfile: jest.fn(),
  getFirebaseProfile: jest.fn(() => Promise.resolve(null)),
  getAllFirebaseProfiles: jest.fn(() => Promise.resolve([])),
  deleteFirebaseProfile: jest.fn(),
}));

// Mock hybrid auth service to use local only
jest.mock('./services/hybridAuthService', () => {
  const { createUser, authenticateUser } = jest.requireActual('./utils/userManagement');
  return {
    hybridSignUp: jest.fn(async (email, password) => {
      return await createUser(email, password);
    }),
    hybridSignIn: jest.fn(async (email, password) => {
      return await authenticateUser(email, password);
    }),
    isFirebaseSyncAvailable: jest.fn(() => false),
  };
});

// Mock hybrid profile service to use local only
jest.mock('./services/hybridProfileService', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  return {
    hybridCreateProfile: jest.fn(async (profile) => {
      await AsyncStorage.setItem('profile', JSON.stringify(profile));
      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      let allProfiles = allProfilesData ? JSON.parse(allProfilesData) : [];
      allProfiles = allProfiles.filter((p) => p.email !== profile.email);
      allProfiles.push(profile);
      await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
    }),
    hybridUpdateProfile: jest.fn(async (email, updates) => {
      const profileData = await AsyncStorage.getItem('profile');
      if (profileData) {
        const currentProfile = JSON.parse(profileData);
        const updatedProfile = { ...currentProfile, ...updates };
        await AsyncStorage.setItem('profile', JSON.stringify(updatedProfile));
        
        const allProfilesData = await AsyncStorage.getItem('allProfiles');
        if (allProfilesData) {
          let allProfiles = JSON.parse(allProfilesData);
          const index = allProfiles.findIndex((p) => p.email === email);
          if (index !== -1) {
            allProfiles[index] = updatedProfile;
            await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
          }
        }
      }
    }),
    hybridGetProfile: jest.fn(async (email) => {
      const profileData = await AsyncStorage.getItem('profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.email === email) {
          return profile;
        }
      }
      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      if (allProfilesData) {
        const allProfiles = JSON.parse(allProfilesData);
        return allProfiles.find((p) => p.email === email) || null;
      }
      return null;
    }),
    hybridGetAllProfiles: jest.fn(async () => {
      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      return allProfilesData ? JSON.parse(allProfilesData) : [];
    }),
    isFirebaseSyncAvailable: jest.fn(() => false),
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => {
    const storage = global.__SECURE_STORAGE__ || {};
    return storage[key] || null;
  }),
  setItemAsync: jest.fn(async (key, value) => {
    if (!global.__SECURE_STORAGE__) {
      global.__SECURE_STORAGE__ = {};
    }
    global.__SECURE_STORAGE__[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    if (global.__SECURE_STORAGE__) {
      delete global.__SECURE_STORAGE__[key];
    }
  }),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (length) => {
    // Return a deterministic "random" value for testing
    return new Uint8Array(length).fill(42);
  }),
  digestStringAsync: jest.fn(async (algorithm, data) => {
    // Simple deterministic hash for testing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
}));

// Mock expo-router
jest.mock('expo-router', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn((callback) => {
      // Don't call callback automatically - let useEffect handle initial load
      // Tests can manually trigger focus if needed
    }),
    Stack: {
      Screen: ({ children }: any) => children,
    },
    Tabs: {
      Screen: ({ children }: any) => children,
    },
  };
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock expo-calendar
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCalendarsAsync: jest.fn(() => Promise.resolve([{ id: 'default', allowsModifications: true }])),
  createEventAsync: jest.fn(() => Promise.resolve('event-id')),
  EntityTypes: {
    EVENT: 'event',
  },
}));

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock Firebase Meeting Service
jest.mock('./services/firebaseMeetingService', () => ({
  createMeetingRequest: jest.fn(),
  getMeeting: jest.fn(),
  updateMeeting: jest.fn(),
  deleteMeeting: jest.fn(),
  getUserMeetings: jest.fn(() => Promise.resolve([])),
  getPendingMeetingRequests: jest.fn(() => Promise.resolve([])),
  getUpcomingMeetings: jest.fn(() => Promise.resolve([])),
  subscribeToUserMeetings: jest.fn(() => () => {}),
}));

// Mock Hybrid Meeting Service
jest.mock('./services/hybridMeetingService', () => ({
  hybridCreateMeeting: jest.fn(),
  hybridGetMeeting: jest.fn(),
  hybridUpdateMeeting: jest.fn(),
  hybridDeleteMeeting: jest.fn(),
  hybridGetUserMeetings: jest.fn(() => Promise.resolve([])),
  hybridGetPendingMeetings: jest.fn(() => Promise.resolve([])),
  hybridGetUpcomingMeetings: jest.fn(() => Promise.resolve([])),
  hybridSubscribeToMeetings: jest.fn(() => () => {}),
}));

// Mock Hybrid Message Service
jest.mock('./services/hybridMessageService', () => ({
  hybridSendMessage: jest.fn(),
  hybridSubscribeToChat: jest.fn(() => () => {}),
  hybridMarkMessagesAsRead: jest.fn(),
  hybridGetUnreadMessageCount: jest.fn(() => Promise.resolve(0)),
  generateConversationId: jest.fn((email1, email2) => {
    const emails = [email1, email2].sort();
    return emails.join('_');
  }),
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Clear secure storage before each test
beforeEach(() => {
  global.__SECURE_STORAGE__ = {};
});
