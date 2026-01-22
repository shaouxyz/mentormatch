// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
      // Call callback immediately for testing
      if (typeof callback === 'function') {
        callback();
      }
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
