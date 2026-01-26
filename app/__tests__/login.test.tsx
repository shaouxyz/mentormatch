import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../login';
import * as expoRouter from 'expo-router';
import { initializeTestAccounts } from '../../utils/testAccounts';
import * as hybridProfileService from '@/services/hybridProfileService';

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock hybrid profile service
jest.mock('@/services/hybridProfileService', () => ({
  hybridGetProfile: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
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

  it('should show error when fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('should successfully login with test account t0', async () => {
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
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't1');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  it('should show error for invalid test account password', async () => {
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

    // Mock hybridGetProfile to return the profile
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
});
