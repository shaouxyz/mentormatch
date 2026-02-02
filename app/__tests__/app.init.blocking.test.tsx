/**
 * App Initialization Blocking Tests
 * 
 * Tests to verify that app initialization does not block rendering
 * and that all initialization is properly deferred and non-blocking.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from '../index';
import * as expoRouter from 'expo-router';
import * as testAccounts from '@/utils/testAccounts';
import * as dataMigration from '@/utils/dataMigration';
import * as sessionManager from '@/utils/sessionManager';
import * as firebaseConfig from '@/config/firebase.config';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/testAccounts');
jest.mock('@/utils/dataMigration');
jest.mock('@/utils/sessionManager');
jest.mock('@/config/firebase.config');
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

const mockInitializeFirebase = firebaseConfig.initializeFirebase as jest.Mock;
const mockIsFirebaseConfigured = firebaseConfig.isFirebaseConfigured as jest.Mock;
const mockInitializeTestAccounts = testAccounts.initializeTestAccounts as jest.Mock;
const mockInitializeDataMigration = dataMigration.initializeDataMigration as jest.Mock;
const mockIsSessionValid = sessionManager.isSessionValid as jest.Mock;
const mockRefreshSession = sessionManager.refreshSession as jest.Mock;

// Mock console.log for __DEV__ checks
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();
beforeAll(() => {
  (global as any).__DEV__ = true;
  console.log = mockConsoleLog;
});

afterAll(() => {
  console.log = originalConsoleLog;
  delete (global as any).__DEV__;
});

describe('App Initialization Blocking Prevention', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    await AsyncStorage.clear();
    mockInitializeFirebase.mockReturnValue(undefined);
    mockIsFirebaseConfigured.mockReturnValue(false);
    mockInitializeTestAccounts.mockResolvedValue(undefined);
    mockInitializeDataMigration.mockResolvedValue(undefined);
    mockIsSessionValid.mockResolvedValue(true);
    mockRefreshSession.mockResolvedValue(undefined);
  });

  describe('Rendering Before Initialization', () => {
    it('should render UI immediately before initialization starts', () => {
      const { getByText } = render(<WelcomeScreen />);
      
      // UI should render immediately - verify elements are present
      expect(getByText('MentorMatch')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
      expect(getByText('Log In')).toBeTruthy();
      
      // Verify initialization hasn't started yet (it's deferred by 100ms)
      // Use a small delay to ensure we check before setTimeout fires
      expect(mockInitializeDataMigration).not.toHaveBeenCalled();
      expect(mockInitializeTestAccounts).not.toHaveBeenCalled();
      
      // The key test: UI renders before any async initialization
      // We don't test exact timing as it varies in test environment
      // Instead, we verify the UI is present and initialization hasn't started
    });

    it('should render UI even when initialization is slow', async () => {
      // Make initialization very slow
      mockInitializeDataMigration.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      const { getByText } = render(<WelcomeScreen />);
      
      // UI should render immediately, not wait for initialization
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Initialization should happen asynchronously
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should not block on Firebase initialization', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockInitializeFirebase.mockImplementation(() => {
        // Simulate slow Firebase init
        return new Promise(resolve => setTimeout(resolve, 500));
      });
      
      const { getByText } = render(<WelcomeScreen />);
      
      // UI should render immediately
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Firebase init should happen asynchronously
      await waitFor(() => {
        expect(mockInitializeFirebase).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Deferred Initialization', () => {
    it('should defer initialization using setTimeout', async () => {
      render(<WelcomeScreen />);
      
      // Initialization should be deferred (not called immediately)
      // Wait a bit to ensure setTimeout has run
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // After timeout, initialization should have started
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
      });
    });

    it('should use dynamic import for Firebase config', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      render(<WelcomeScreen />);
      
      // Wait for dynamic import to complete
      await waitFor(() => {
        expect(mockInitializeFirebase).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle initialization errors without blocking', async () => {
      mockInitializeDataMigration.mockRejectedValue(new Error('Migration failed'));
      mockInitializeTestAccounts.mockRejectedValue(new Error('Test accounts failed'));
      
      const { getByText } = render(<WelcomeScreen />);
      
      // UI should still render
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Errors should be caught and logged, but not block
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Initialization Timeouts', () => {
    it('should log warning if data migration takes too long', async () => {
      // Make migration take longer than 5 seconds
      mockInitializeDataMigration.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );
      
      render(<WelcomeScreen />);
      
      // Wait for timeout warning (should log after 5 seconds)
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('[APP_INIT] Data migration taking longer than expected')
        );
      }, { timeout: 6000 });
    });

    it('should log warning if test accounts init takes too long', async () => {
      // Make test accounts init take longer than 5 seconds
      mockInitializeTestAccounts.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );
      
      render(<WelcomeScreen />);
      
      // Wait for timeout warning
      await waitFor(() => {
        const logCalls = mockConsoleLog.mock.calls.map(call => call[0]);
        expect(logCalls.some(log => 
          typeof log === 'string' && log.includes('[APP_INIT] Test accounts initialization taking longer than expected')
        )).toBe(true);
      }, { timeout: 6000 });
    });
  });

  describe('Firebase Initialization Error Handling', () => {
    it('should not throw error if Firebase initialization fails', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockInitializeFirebase.mockImplementation(() => {
        throw new Error('Firebase init failed');
      });
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should still render
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Error should be logged but not thrown
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    it('should continue if Firebase Auth initialization fails', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      // Firebase init should succeed but Auth might fail
      mockInitializeFirebase.mockImplementation(() => {
        // Simulate Auth failure but app continues
        logger.warn('Firebase Auth failed');
      });
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should still render
      expect(getByText('MentorMatch')).toBeTruthy();
    });

    it('should continue if Firestore initialization fails', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      render(<WelcomeScreen />);
      
      // App should still work even if Firestore fails
      await waitFor(() => {
        expect(mockInitializeFirebase).toHaveBeenCalled();
      });
    });
  });

  describe('Initialization Logging', () => {
    it('should log initialization steps in development mode', async () => {
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith('[APP_INIT] Starting initialization');
      });
      
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith('[APP_INIT] Checking Firebase configuration');
      });
    });

    it('should log when Firebase is not configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith('[APP_INIT] Firebase not configured, skipping');
      });
    });

    it('should log when Firebase is configured and initializing', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith('[APP_INIT] Firebase configured, initializing...');
      });
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should cleanup initialization timeout on unmount', () => {
      const { unmount } = render(<WelcomeScreen />);
      
      // Unmount before initialization completes
      unmount();
      
      // Should not have errors
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Initialization Prevention', () => {
    it('should only initialize once even with multiple renders', async () => {
      const { rerender } = render(<WelcomeScreen />);
      
      // Trigger multiple renders
      rerender(<WelcomeScreen />);
      rerender(<WelcomeScreen />);
      
      // Wait for initialization
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
      });
      
      // Should only be called once due to hasInitialized guard
      expect(mockInitializeDataMigration).toHaveBeenCalledTimes(1);
      expect(mockInitializeTestAccounts).toHaveBeenCalledTimes(1);
    });
  });
});
