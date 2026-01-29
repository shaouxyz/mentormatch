import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../login';
import * as expoRouter from 'expo-router';
import { initializeTestAccounts, getTestAccount } from '../../utils/testAccounts';
import * as hybridProfileService from '@/services/hybridProfileService';
import * as hybridAuthService from '@/services/hybridAuthService';
import * as firebaseAuthService from '@/services/firebaseAuthService';
import * as firebaseProfileService from '@/services/firebaseProfileService';
import * as rateLimiter from '../../utils/rateLimiter';
import * as userManagement from '../../utils/userManagement';
import * as logger from '@/utils/logger';

// Some tests intentionally wait for async effects; raise per-file timeout.
jest.setTimeout(20000);

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock hybrid profile service
jest.mock('@/services/hybridProfileService', () => ({
  hybridGetProfile: jest.fn(),
}));

// Mock hybrid auth service
jest.mock('@/services/hybridAuthService', () => ({
  hybridSignIn: jest.fn(),
}));

// Mock Firebase services for dynamic imports
jest.mock('@/services/firebaseAuthService', () => ({
  getCurrentFirebaseUser: jest.fn(),
}));

jest.mock('@/services/firebaseProfileService', () => ({
  createFirebaseProfile: jest.fn(),
}));

// Mock rate limiter
jest.mock('../../utils/rateLimiter', () => ({
  isRateLimited: jest.fn(),
  resetRateLimit: jest.fn(),
  getRemainingAttempts: jest.fn(),
}));

// Mock user management
jest.mock('../../utils/userManagement', () => ({
  authenticateUser: jest.fn(),
  setCurrentUser: jest.fn(),
  createUser: jest.fn(),
}));

// Mock logger (match app/login.tsx import path)
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock test accounts
jest.mock('../../utils/testAccounts', () => ({
  initializeTestAccounts: jest.fn(),
  getTestAccount: jest.fn(),
}));

// Mock session manager
jest.mock('../../utils/sessionManager', () => ({
  startSession: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    
    // Setup default mocks
    (initializeTestAccounts as jest.Mock).mockResolvedValue(undefined);
    (rateLimiter.isRateLimited as jest.Mock).mockResolvedValue(false);
    (rateLimiter.resetRateLimit as jest.Mock).mockResolvedValue(undefined);
    (rateLimiter.getRemainingAttempts as jest.Mock).mockResolvedValue(5);
    (userManagement.setCurrentUser as jest.Mock).mockResolvedValue(undefined);
    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);
    (hybridAuthService.hybridSignIn as jest.Mock).mockImplementation(async (email: string, password: string) => {
      const { hashPassword, verifyPassword } = require('../../utils/security');
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];
      const user = users.find((u: any) => u.email === email.toLowerCase());
      if (user && await verifyPassword(password, user.passwordHash)) {
        return user;
      }
      throw new Error('Invalid email or password');
    });
    
    // Setup default getTestAccount mock to return null (tests will override as needed)
    (getTestAccount as jest.Mock).mockResolvedValue(null);
    
    // Mock startSession
    const { startSession } = require('../../utils/sessionManager');
    (startSession as jest.Mock).mockResolvedValue(undefined);
    
    await initializeTestAccounts();
  });

  it('should render login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Log in to continue')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('should use iOS keyboard avoiding behavior when Platform.OS is ios', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const { UNSAFE_getByType } = render(<LoginScreen />);
    const kav = UNSAFE_getByType(KeyboardAvoidingView);
    expect(kav.props.behavior).toBe('padding');

    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('should use non-iOS keyboard avoiding behavior when Platform.OS is android', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android' });

    const { UNSAFE_getByType } = render(<LoginScreen />);
    const kav = UNSAFE_getByType(KeyboardAvoidingView);
    expect(kav.props.behavior).toBe('height');

    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('should show error when fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('should successfully login with test account t0', async () => {
    const testAccount = {
      email: 't0@example.com',
      password: '123',
      name: 'Test User 0',
      profile: {
        name: 'Test User 0',
        email: 't0@example.com',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        phoneNumber: '+1234567890',
      },
    };
    
    (getTestAccount as jest.Mock).mockResolvedValueOnce(testAccount);
    (userManagement.createUser as jest.Mock).mockResolvedValueOnce({
      email: 't0@example.com',
      id: 'test-id',
      createdAt: new Date().toISOString(),
    });
    
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });

    const userData = await AsyncStorage.getItem('user');
    expect(userData).toBeTruthy();
    const user = JSON.parse(userData || '{}');
    // Email is normalized to t0@example.com
    expect(user.email).toBe('t0@example.com');
    expect(user.isTestAccount).toBe(true);

    const profile = await AsyncStorage.getItem('profile');
    expect(profile).toBeTruthy();
  });

  it('should successfully login with test account t1', async () => {
    const testAccount = {
      email: 't1@example.com',
      password: '123',
      name: 'Test User 1',
      profile: {
        name: 'Test User 1',
        email: 't1@example.com',
        expertise: 'Data Science',
        interest: 'Software Development',
        expertiseYears: 7,
        interestYears: 2,
        phoneNumber: '+1234567891',
      },
    };
    
    (getTestAccount as jest.Mock).mockResolvedValueOnce(testAccount);
    (userManagement.createUser as jest.Mock).mockResolvedValueOnce({
      email: 't1@example.com',
      id: 'test-id-1',
      createdAt: new Date().toISOString(),
    });
    
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't1');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  it('should show error for invalid test account password', async () => {
    const testAccount = {
      email: 't0@example.com',
      password: '123',
      name: 'Test User 0',
      profile: {
        name: 'Test User 0',
        email: 't0@example.com',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        phoneNumber: '+1234567890',
      },
    };
    
    (getTestAccount as jest.Mock).mockResolvedValueOnce(testAccount);
    
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });
  });

  it('should successfully login with regular user account', async () => {
    const profile = {
      name: 'Regular User',
      email: 'regular@example.com',
      expertise: 'Test',
      interest: 'Test',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890'
    };

    // Mock hybridGetProfile to return the profile (simulating Firebase sync)
    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(profile);
    
    // Create a regular user account with hashed password
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'regular@example.com',
      passwordHash: passwordHash,
      id: '123',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'regular@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(hybridProfileService.hybridGetProfile).toHaveBeenCalledWith('regular@example.com');
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    }, { timeout: 3000 });
  });

  it('should navigate to profile creation if user has no profile', async () => {
    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'noprofile@example.com',
      passwordHash: passwordHash,
      id: '456',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'noprofile@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(hybridProfileService.hybridGetProfile).toHaveBeenCalledWith('noprofile@example.com');
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile/create');
    });
  });

  it('should load profile from Firestore and save locally on login', async () => {
    const firestoreProfile = {
      name: 'Firestore User',
      email: 'firestore@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
      location: 'New York',
    };

    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(firestoreProfile);
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'firestore@example.com',
      passwordHash: passwordHash,
      id: '789',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'firestore@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(hybridProfileService.hybridGetProfile).toHaveBeenCalledWith('firestore@example.com');
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });

    // Verify profile was saved locally
    const savedProfile = await AsyncStorage.getItem('profile');
    expect(savedProfile).toBeTruthy();
    const parsedProfile = JSON.parse(savedProfile || '{}');
    expect(parsedProfile.email).toBe('firestore@example.com');
    expect(parsedProfile.name).toBe('Firestore User');
  });

  it('should add profile to allProfiles when loaded from Firestore', async () => {
    const firestoreProfile = {
      name: 'Firestore User',
      email: 'firestore2@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
    };

    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(firestoreProfile);
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'firestore2@example.com',
      passwordHash: passwordHash,
      id: '790',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'firestore2@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });

    // Verify profile was added to allProfiles
    const allProfilesData = await AsyncStorage.getItem('allProfiles');
    expect(allProfilesData).toBeTruthy();
    const allProfiles = JSON.parse(allProfilesData || '[]');
    const foundProfile = allProfiles.find((p: any) => p.email === 'firestore2@example.com');
    expect(foundProfile).toBeTruthy();
    expect(foundProfile.name).toBe('Firestore User');
  });

  it('should use local profile if Firestore check fails but local exists', async () => {
    const localProfile = {
      name: 'Local User',
      email: 'local@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
    };

    // Mock hybridGetProfile to return local profile (simulating Firestore failure but local success)
    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(localProfile);
    
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'local@example.com',
      passwordHash: passwordHash,
      id: '791',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'local@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(hybridProfileService.hybridGetProfile).toHaveBeenCalledWith('local@example.com');
      // Should navigate to home since profile exists
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });

    // Verify profile was saved locally
    const savedProfile = await AsyncStorage.getItem('profile');
    expect(savedProfile).toBeTruthy();
    const parsedProfile = JSON.parse(savedProfile || '{}');
    expect(parsedProfile.email).toBe('local@example.com');
  });

  it('should show error for non-existent account', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'nonexistent@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });
  });

  it('should show error for wrong password', async () => {
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('correctpassword');
    
    const users = [{
      email: 'test@example.com',
      passwordHash: passwordHash,
      id: '789',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });
  });

  it('should navigate to signup screen', () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Don't have an account? Sign Up"));

    expect(mockRouter.push).toHaveBeenCalledWith('/signup');
  });

  it('should show loading state during login', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    // Button should show loading text
    await waitFor(() => {
      expect(getByText('Logging in...')).toBeTruthy();
    });
  });

  it('should handle errors gracefully', async () => {
    const originalGetItem = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn(() => Promise.reject(new Error('Storage error')));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });

    AsyncStorage.getItem = originalGetItem;
  });

  describe('Firebase profile sync on login', () => {
    it('should save profile to allProfiles when loaded from Firebase', async () => {
      const profile = {
        name: 'Firebase User',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 2,
        email: 'firebase@example.com',
        phoneNumber: '+1234567890',
      };

      // Mock hybridGetProfile to return profile from Firebase
      (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(profile);

      const { hashPassword } = require('../../utils/security');
      const passwordHash = await hashPassword('password123');
      
      const users = [{
        email: 'firebase@example.com',
        passwordHash: passwordHash,
        id: 'firebase123',
        createdAt: new Date().toISOString(),
      }];
      await AsyncStorage.setItem('users', JSON.stringify(users));

      const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'firebase@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByLabelText('Log in button'));

      await waitFor(() => {
        expect(hybridProfileService.hybridGetProfile).toHaveBeenCalledWith('firebase@example.com');
      });

      // Verify profile was saved to allProfiles
      await waitFor(async () => {
        const allProfilesData = await AsyncStorage.getItem('allProfiles');
        expect(allProfilesData).toBeTruthy();
        const allProfiles = JSON.parse(allProfilesData || '[]');
        expect(allProfiles.some((p: any) => p.email === 'firebase@example.com')).toBe(true);
      });
    });

    it('should handle Firebase sync failure gracefully and use local profile', async () => {
      const localProfile = {
        name: 'Local User',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 2,
        email: 'local@example.com',
        phoneNumber: '+1234567890',
      };

      // Set local profile first
      await AsyncStorage.setItem('profile', JSON.stringify(localProfile));
      await AsyncStorage.setItem('allProfiles', JSON.stringify([localProfile]));

      const { hashPassword } = require('../../utils/security');
      const passwordHash = await hashPassword('password123');
      
      const users = [{
        email: 'local@example.com',
        passwordHash: passwordHash,
        id: 'local123',
        createdAt: new Date().toISOString(),
      }];
      await AsyncStorage.setItem('users', JSON.stringify(users));

      // Mock hybridGetProfile to return null (simulating Firebase failure, but local profile exists)
      // The login code will catch the error and check local storage
      (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(localProfile);

      const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'local@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByLabelText('Log in button'));

      // Should navigate to home since profile exists (from local storage)
      await waitFor(() => {
        expect(hybridProfileService.hybridGetProfile).toHaveBeenCalledWith('local@example.com');
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      }, { timeout: 3000 });
    });
  });

  it('should sync local profile to Firebase when profile exists locally but not in Firebase', async () => {
    const localProfile = {
      name: 'Local User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'sync@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('profile', JSON.stringify(localProfile));

    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'sync@example.com',
      passwordHash: passwordHash,
      id: 'sync123',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    // Mock hybridGetProfile to return null (no Firebase profile)
    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);

    // Mock Firebase services (static imports in app/login.tsx)
    (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
      email: 'sync@example.com',
      uid: 'firebase-uid',
    });
    (firebaseProfileService.createFirebaseProfile as jest.Mock).mockResolvedValue(undefined);

    const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'sync@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByLabelText('Log in button'));

    await waitFor(() => {
      expect(firebaseProfileService.createFirebaseProfile).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    }, { timeout: 3000 });
  });

  it('should handle profile sync error gracefully and use local profile', async () => {
    const localProfile = {
      name: 'Local User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'local@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('profile', JSON.stringify(localProfile));

    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'local@example.com',
      passwordHash: passwordHash,
      id: 'local123',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    // Mock hybridGetProfile to return null (no Firebase profile)
    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);

    // Mock Firebase services to throw error (static imports in app/login.tsx)
    (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
      email: 'local@example.com',
      uid: 'firebase-uid',
    });
    (firebaseProfileService.createFirebaseProfile as jest.Mock).mockRejectedValueOnce(new Error('Sync failed'));

    const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'local@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByLabelText('Log in button'));

    // Should still navigate to home using local profile
    await waitFor(() => {
      expect(logger.logger.warn).toHaveBeenCalledWith(
        'Failed to sync profile to Firestore, using local profile',
        expect.objectContaining({
          email: 'local@example.com',
          error: expect.any(String),
        })
      );
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    }, { timeout: 3000 });
  });

  it('should handle profile sync non-Error rejection gracefully and use local profile', async () => {
    const localProfile = {
      name: 'Local User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'local2@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('profile', JSON.stringify(localProfile));

    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    await AsyncStorage.setItem(
      'users',
      JSON.stringify([
        {
          email: 'local2@example.com',
          passwordHash,
          id: 'local2',
          createdAt: new Date().toISOString(),
        },
      ])
    );

    (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);
    (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
      email: 'local2@example.com',
      uid: 'firebase-uid',
    });
    // eslint-disable-next-line prefer-promise-reject-errors
    (firebaseProfileService.createFirebaseProfile as jest.Mock).mockRejectedValueOnce('Sync failed');

    const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'local2@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByLabelText('Log in button'));

    await waitFor(() => {
      expect(logger.logger.warn).toHaveBeenCalledWith(
        'Failed to sync profile to Firestore, using local profile',
        expect.objectContaining({
          email: 'local2@example.com',
          error: expect.any(String),
        })
      );
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  describe('Uncovered branches', () => {
    it('should handle initializeTestAccounts non-Error rejection in useEffect', async () => {
      // eslint-disable-next-line prefer-promise-reject-errors
      (initializeTestAccounts as jest.Mock).mockRejectedValueOnce('Init failed');

      render(<LoginScreen />);

      await waitFor(() => {
        expect(logger.logger.error).toHaveBeenCalledWith(
          'Failed to initialize test accounts',
          expect.any(Error)
        );
      });
    });

    it('should handle initializeTestAccounts error in useEffect', async () => {
      (initializeTestAccounts as jest.Mock).mockRejectedValueOnce(new Error('Init failed'));
      
      render(<LoginScreen />);
      
      await waitFor(() => {
        expect(logger.logger.error).toHaveBeenCalledWith(
          'Failed to initialize test accounts',
          expect.any(Error)
        );
      });
    });

    it('should show rate limit error when rate limited', async () => {
      (rateLimiter.isRateLimited as jest.Mock).mockResolvedValueOnce(true);
      
      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByLabelText('Log in button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Too Many Attempts',
          'Too many login attempts. Please try again later.',
          [{ text: 'OK' }]
        );
      });
    });

    it('should handle test account createUser failure and fallback to authenticateUser', async () => {
      const testAccount = {
        email: 't0@example.com',
        password: '123',
        profile: { name: 'Test User', email: 't0@example.com' },
      };
      
      (getTestAccount as jest.Mock).mockResolvedValueOnce(testAccount);
      (userManagement.createUser as jest.Mock).mockRejectedValueOnce(new Error('User exists'));
      (userManagement.authenticateUser as jest.Mock).mockResolvedValueOnce({
        email: 't0@example.com',
        id: 'test-id',
        createdAt: new Date().toISOString(),
      });
      
      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
      fireEvent.press(getByLabelText('Log in button'));
      
      // Wait for authenticateUser to be called (fallback after createUser fails)
      await waitFor(() => {
        // LoginScreen calls authenticateUser with sanitized input email (sanitizeEmail('t0') => 't0')
        expect(userManagement.authenticateUser).toHaveBeenCalledWith('t0', '123');
      }, { timeout: 5000 });
      
      // Then wait for navigation
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      }, { timeout: 5000 });
    });

    it('should not write test profile when test account has no profile', async () => {
      const { startSession } = require('../../utils/sessionManager');
      (startSession as jest.Mock).mockResolvedValue(undefined);

      const testAccount = {
        email: 't0@example.com',
        password: '123',
        profile: undefined,
      };

      (getTestAccount as jest.Mock).mockResolvedValueOnce(testAccount);
      (userManagement.createUser as jest.Mock).mockResolvedValueOnce({
        email: 't0@example.com',
        id: 'test-id',
        createdAt: new Date().toISOString(),
      });

      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
      fireEvent.press(getByLabelText('Log in button'));

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      });

      // Should not set profile in AsyncStorage when testAccount.profile is missing
      const profile = await AsyncStorage.getItem('profile');
      expect(profile).toBeNull();
    });

    it('should handle test account authentication failure when authenticateUser returns null', async () => {
      const testAccount = {
        email: 't0@example.com',
        password: '123',
        profile: { name: 'Test User', email: 't0@example.com' },
      };
      
      (getTestAccount as jest.Mock).mockResolvedValueOnce(testAccount);
      (userManagement.createUser as jest.Mock).mockRejectedValueOnce(new Error('User exists'));
      (userManagement.authenticateUser as jest.Mock).mockResolvedValueOnce(null);
      
      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
      fireEvent.press(getByLabelText('Log in button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Invalid email or password'),
          expect.any(Array)
        );
      });
    });

    it('should sync local profile to Firebase when currentUser email matches', async () => {
      const localProfile = {
        name: 'Local User',
        email: 'sync2@example.com',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 2,
        phoneNumber: '+1234567890',
      };
      
      await AsyncStorage.setItem('profile', JSON.stringify(localProfile));
      
      const { hashPassword } = require('../../utils/security');
      const passwordHash = await hashPassword('password123');
      
      const users = [{
        email: 'sync2@example.com',
        passwordHash: passwordHash,
        id: 'sync2-id',
        createdAt: new Date().toISOString(),
      }];
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      (hybridProfileService.hybridGetProfile as jest.Mock)
        .mockResolvedValueOnce(null) // First call returns null
        .mockResolvedValueOnce(localProfile); // After sync, returns profile
      
      (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
        email: 'sync2@example.com',
        uid: 'firebase-uid',
      });
      (firebaseProfileService.createFirebaseProfile as jest.Mock).mockResolvedValue(undefined);
      
      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'sync2@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByLabelText('Log in button'));
      
      // Wait for navigation (this happens after profile sync)
      // Note: Dynamic imports make it difficult to verify Firebase sync directly,
      // but navigation confirms login succeeded
      await waitFor(() => {
        expect(firebaseProfileService.createFirebaseProfile).toHaveBeenCalledWith(localProfile);
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      }, { timeout: 10000 });
    });

    it('should use local profile when Firebase user email does not match', async () => {
      const localProfile = {
        name: 'Local User',
        email: 'sync3@example.com',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 2,
        phoneNumber: '+1234567890',
      };
      
      await AsyncStorage.setItem('profile', JSON.stringify(localProfile));
      
      const { hashPassword } = require('../../utils/security');
      const passwordHash = await hashPassword('password123');
      
      const users = [{
        email: 'sync3@example.com',
        passwordHash: passwordHash,
        id: 'sync3-id',
        createdAt: new Date().toISOString(),
      }];
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);
      
      (firebaseAuthService.getCurrentFirebaseUser as jest.Mock).mockReturnValue({
        email: 'different@example.com', // Different email
        uid: 'firebase-uid',
      });
      
      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'sync3@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByLabelText('Log in button'));
      
      await waitFor(() => {
        expect(logger.logger.warn).toHaveBeenCalledWith(
          'User not authenticated in Firebase, cannot sync profile',
          expect.objectContaining({
            email: 'sync3@example.com',
            hasCurrentUser: true,
            currentUserEmail: 'different@example.com',
          })
        );
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      }, { timeout: 10000 });
    });

    it('should skip local profile sync if local profile email does not match user email', async () => {
      const localProfile = {
        name: 'Local User',
        email: 'different-local@example.com',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 2,
        phoneNumber: '+1234567890',
      };

      await AsyncStorage.setItem('profile', JSON.stringify(localProfile));

      const { hashPassword } = require('../../utils/security');
      const passwordHash = await hashPassword('password123');
      await AsyncStorage.setItem(
        'users',
        JSON.stringify([
          {
            email: 'user@example.com',
            passwordHash,
            id: 'u1',
            createdAt: new Date().toISOString(),
          },
        ])
      );

      (hybridProfileService.hybridGetProfile as jest.Mock).mockResolvedValue(null);

      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'user@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByLabelText('Log in button'));

      await waitFor(() => {
        // local profile email mismatch => should not attempt Firebase profile creation
        expect(firebaseProfileService.createFirebaseProfile).not.toHaveBeenCalled();
      });
    });

    it('should show error when remaining attempts is 0', async () => {
      const { ErrorHandler } = require('../../utils/errorHandler');
      const mockHandleError = jest.spyOn(ErrorHandler, 'handleError');
      
      (rateLimiter.getRemainingAttempts as jest.Mock).mockResolvedValueOnce(0);
      
      const { hashPassword } = require('../../utils/security');
      const passwordHash = await hashPassword('password123');
      
      const users = [{
        email: 'test@example.com',
        passwordHash: passwordHash,
        id: 'test-id',
        createdAt: new Date().toISOString(),
      }];
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Mock hybridSignIn to throw error
      (hybridAuthService.hybridSignIn as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid credentials')
      );
      
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
      fireEvent.press(getByText('Log In'));
      
      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.any(Error),
          'Too many failed attempts. Please try again later.',
          { email: 'test@example.com' }
        );
      });
      
      mockHandleError.mockRestore();
    });

    it('should show singular remaining attempt message when remainingAttempts is 1', async () => {
      const { ErrorHandler } = require('../../utils/errorHandler');
      const mockHandleError = jest.spyOn(ErrorHandler, 'handleError');

      (rateLimiter.getRemainingAttempts as jest.Mock).mockResolvedValueOnce(1);
      (hybridAuthService.hybridSignIn as jest.Mock).mockRejectedValueOnce(new Error('Invalid email or password'));

      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
      fireEvent.press(getByLabelText('Log in button'));

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.stringContaining('1 attempt remaining.'),
          { email: 'test@example.com' }
        );
      });

      mockHandleError.mockRestore();
    });

    it('should show plural remaining attempts message when remainingAttempts is 2', async () => {
      const { ErrorHandler } = require('../../utils/errorHandler');
      const mockHandleError = jest.spyOn(ErrorHandler, 'handleError');

      (rateLimiter.getRemainingAttempts as jest.Mock).mockResolvedValueOnce(2);
      (hybridAuthService.hybridSignIn as jest.Mock).mockRejectedValueOnce(new Error('Invalid email or password'));

      const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
      fireEvent.press(getByLabelText('Log in button'));

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.stringContaining('2 attempts remaining.'),
          { email: 'test@example.com' }
        );
      });

      mockHandleError.mockRestore();
    });
  });
});
