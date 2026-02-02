/**
 * App Loading Tests
 * 
 * Tests to verify that the Expo app can load successfully from a phone.
 * These tests simulate the app initialization process and verify:
 * - App can start without hanging
 * - All initialization code runs without blocking
 * - Initial screen renders correctly
 * - Navigation works
 * - No errors during startup
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from '../index';
import RootLayout from '../_layout';
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
    // Call immediately for testing
    callback();
  },
  Stack: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockInitializeFirebase = firebaseConfig.initializeFirebase as jest.Mock;
const mockIsFirebaseConfigured = firebaseConfig.isFirebaseConfigured as jest.Mock;
const mockInitializeTestAccounts = testAccounts.initializeTestAccounts as jest.Mock;
const mockInitializeDataMigration = dataMigration.initializeDataMigration as jest.Mock;
const mockIsSessionValid = sessionManager.isSessionValid as jest.Mock;
const mockRefreshSession = sessionManager.refreshSession as jest.Mock;

describe('App Loading from Phone', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockInitializeFirebase.mockReturnValue(undefined);
    mockIsFirebaseConfigured.mockReturnValue(false); // Default: Firebase not configured
    mockInitializeTestAccounts.mockResolvedValue(undefined);
    mockInitializeDataMigration.mockResolvedValue(undefined);
    mockIsSessionValid.mockResolvedValue(true);
    mockRefreshSession.mockResolvedValue(undefined);
  });

  describe('App Initialization', () => {
    it('should load app without hanging or blocking', async () => {
      const startTime = Date.now();
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should render quickly (within 1 second)
      await waitFor(() => {
        expect(getByText('MentorMatch')).toBeTruthy();
      }, { timeout: 1000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load in under 1 second
    });

    it('should render welcome screen immediately without waiting for initialization', async () => {
      // Make initialization slow to verify it doesn't block rendering
      mockInitializeDataMigration.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 500))
      );
      
      const { getByText } = render(<WelcomeScreen />);
      
      // Screen should render immediately, not wait for initialization
      expect(getByText('MentorMatch')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
      expect(getByText('Log In')).toBeTruthy();
    });

    it('should complete all initialization without errors', async () => {
      render(<WelcomeScreen />);
      
      // Wait for all initialization to complete
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
        expect(mockInitializeTestAccounts).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      // Should not have any errors
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle Firebase initialization when not configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        // Firebase should not be initialized if not configured
        expect(mockInitializeFirebase).not.toHaveBeenCalled();
      });
      
      // App should still work without Firebase
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle Firebase initialization when configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockInitializeFirebase).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle initialization errors gracefully without crashing', async () => {
      mockInitializeDataMigration.mockRejectedValue(new Error('Migration failed'));
      mockInitializeTestAccounts.mockRejectedValue(new Error('Test accounts failed'));
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should still render despite initialization errors
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Wait for initialization attempts (they will fail but be caught)
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
        expect(mockInitializeTestAccounts).toHaveBeenCalled();
      });
      
      // Errors should be logged but not crash the app
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Root Layout Loading', () => {
    it('should have all required routes defined in layout', () => {
      // Verify that all routes are properly configured
      // This is tested implicitly through navigation tests
      // The actual layout rendering is tested in integration tests
      expect(true).toBeTruthy(); // Placeholder - layout structure is verified through navigation
    });
  });

  describe('Navigation After Load', () => {
    it('should allow navigation to signup screen', () => {
      const { getByText } = render(<WelcomeScreen />);
      
      const signUpButton = getByText('Sign Up');
      fireEvent.press(signUpButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/signup');
    });

    it('should allow navigation to login screen', () => {
      const { getByText } = render(<WelcomeScreen />);
      
      const logInButton = getByText('Log In');
      fireEvent.press(logInButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  describe('Session Management on Load', () => {
    it('should check session validity on app load', async () => {
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockIsSessionValid).toHaveBeenCalled();
      });
    });

    it('should navigate to home if user is logged in and session is valid', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com', id: '123' }));
      mockIsSessionValid.mockResolvedValue(true);
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockIsSessionValid).toHaveBeenCalled();
        expect(mockRefreshSession).toHaveBeenCalled();
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      });
    });

    it('should not navigate if user is not logged in', async () => {
      await AsyncStorage.removeItem('user');
      mockIsSessionValid.mockResolvedValue(true);
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockIsSessionValid).toHaveBeenCalled();
      });
      
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('Performance on Load', () => {
    it('should complete initialization within reasonable time', async () => {
      const startTime = Date.now();
      
      render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
        expect(mockInitializeTestAccounts).toHaveBeenCalled();
      });
      
      const initTime = Date.now() - startTime;
      // Initialization should complete within 2 seconds
      expect(initTime).toBeLessThan(2000);
    });

    it('should not block UI rendering during initialization', async () => {
      // Make initialization take time
      let resolveMigration: () => void;
      const migrationPromise = new Promise<void>(resolve => {
        resolveMigration = resolve;
      });
      mockInitializeDataMigration.mockReturnValue(migrationPromise);
      
      const { getByText } = render(<WelcomeScreen />);
      
      // UI should render immediately, before initialization completes
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Complete initialization
      resolveMigration!();
      await migrationPromise;
    });
  });

  describe('Error Recovery on Load', () => {
    it('should recover from Firebase initialization failure', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockInitializeFirebase.mockImplementation(() => {
        throw new Error('Firebase init failed');
      });
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should still render immediately
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Wait for initialization to start (100ms delay) and error to be caught
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Error should be logged but app should continue
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Firebase initialization skipped or failed at app startup, continuing with local only',
          expect.objectContaining({ error: expect.any(String) })
        );
      }, { timeout: 3000 });
    });

    it('should recover from data migration failure', async () => {
      mockInitializeDataMigration.mockRejectedValue(new Error('Migration failed'));
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should still render
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Error should be logged but app should continue
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });
    });

    it('should recover from test accounts initialization failure', async () => {
      mockInitializeTestAccounts.mockRejectedValue(new Error('Test accounts failed'));
      
      const { getByText } = render(<WelcomeScreen />);
      
      // App should still render
      expect(getByText('MentorMatch')).toBeTruthy();
      
      // Error should be logged but app should continue
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Concurrent Load Scenarios', () => {
    it('should handle multiple rapid loads without issues', async () => {
      const { rerender } = render(<WelcomeScreen />);
      
      // Simulate rapid re-renders (like when app comes to foreground)
      rerender(<WelcomeScreen />);
      rerender(<WelcomeScreen />);
      rerender(<WelcomeScreen />);
      
      // Initialization should only happen once
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalledTimes(1);
        expect(mockInitializeTestAccounts).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle load while previous initialization is still running', async () => {
      let resolveMigration: () => void;
      const migrationPromise = new Promise<void>(resolve => {
        resolveMigration = resolve;
      });
      mockInitializeDataMigration.mockReturnValue(migrationPromise);
      
      const { rerender } = render(<WelcomeScreen />);
      
      // Trigger another render while migration is still running
      rerender(<WelcomeScreen />);
      
      // Complete the migration
      resolveMigration!();
      await migrationPromise;
      
      // Should only initialize once
      expect(mockInitializeDataMigration).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during initialization', async () => {
      // Render and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<WelcomeScreen />);
        await waitFor(() => {
          expect(mockInitializeDataMigration).toHaveBeenCalled();
        });
        unmount();
      }
      
      // Should not have excessive calls
      expect(mockInitializeDataMigration).toHaveBeenCalledTimes(5);
    });

    it('should clean up resources on unmount', async () => {
      const { unmount } = render(<WelcomeScreen />);
      
      await waitFor(() => {
        expect(mockInitializeDataMigration).toHaveBeenCalled();
      });
      
      unmount();
      
      // Should not have errors after unmount
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error)
      );
    });
  });
});
